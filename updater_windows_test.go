//go:build windows

package main

import (
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"testing"
	"time"
)

func TestReplaceFileWithChinesePaths(t *testing.T) {
	dir := t.TempDir()
	source := filepath.Join(dir, "新版本-测试.bin")
	target := filepath.Join(dir, "旧应用-测试.exe")
	if err := os.WriteFile(source, []byte("PAYLOAD-42"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(target, []byte("OLD"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := replaceFile(source, target); err != nil {
		t.Fatalf("replaceFile: %v", err)
	}
	data, err := os.ReadFile(target)
	if err != nil {
		t.Fatal(err)
	}
	if string(data) != "PAYLOAD-42" {
		t.Fatalf("target content = %q, want PAYLOAD-42", data)
	}
}

func TestProcessAlive(t *testing.T) {
	if !processAlive(strconv.Itoa(os.Getpid())) {
		t.Fatal("the current test process must be reported as alive")
	}
	if processAlive("99999999") {
		t.Fatal("a non-existent PID must not be reported as alive")
	}
}

// TestRunUpdateHelperEndToEnd compiles a tiny helper binary, runs it as the
// "old process", then runs the updater helper against it and verifies the
// replacement and the automatic restart of the new binary.
func TestRunUpdateHelperEndToEnd(t *testing.T) {
	dir := t.TempDir()
	helperSrc := filepath.Join(dir, "helper.go")
	if err := os.WriteFile(helperSrc, []byte(
		"package main\n"+
			"import (\"os\"; \"path/filepath\")\n"+
			"func main() { _ = os.WriteFile(filepath.Join(os.Getenv(\"HELPER_PROOF_DIR\"), \"proof.txt\"), []byte(\"proof\"), 0o644) }\n"), 0o644); err != nil {
		t.Fatal(err)
	}

	buildHelper := func(name string) string {
		t.Helper()
		path := filepath.Join(dir, name)
		cmd := exec.Command("go", "build", "-o", path, helperSrc)
		cmd.Env = os.Environ()
		if output, err := cmd.CombinedOutput(); err != nil {
			t.Fatalf("go build %s: %v\n%s", name, err, output)
		}
		return path
	}

	// The "old process": helper that exits after writing its proof.
	oldProcess := buildHelper("old-进程.exe")
	newBinary := buildHelper("new-版本.bin")
	targetBinary := buildHelper("目标-应用.exe")

	proofDir := filepath.Join(dir, "proof")
	if err := os.MkdirAll(proofDir, 0o755); err != nil {
		t.Fatal(err)
	}
	oldProof := filepath.Join(proofDir, "old.txt")

	oldCmd := exec.Command(oldProcess)
	oldCmd.Env = append(os.Environ(), "HELPER_PROOF_DIR="+proofDir)
	if err := oldCmd.Start(); err != nil {
		t.Fatal(err)
	}
	parentPID := strconv.Itoa(oldCmd.Process.Pid)
	_ = oldCmd.Wait()
	// Give the process a moment to fully terminate.
	deadline := time.Now().Add(5 * time.Second)
	for processAlive(parentPID) && time.Now().Before(deadline) {
		time.Sleep(50 * time.Millisecond)
	}
	if processAlive(parentPID) {
		t.Fatal("old process did not terminate")
	}
	_ = os.Remove(oldProof)

	logPath := filepath.Join(dir, "apply-update.log")
	if err := runUpdateHelper(newBinary, targetBinary, parentPID, logPath); err != nil {
		t.Fatalf("runUpdateHelper: %v", err)
	}

	// The target binary must have been replaced by the new payload...
	data, err := os.ReadFile(targetBinary)
	if err != nil {
		t.Fatal(err)
	}
	if string(data) != string(mustRead(t, newBinary)) {
		t.Fatal("target was not replaced with the new binary content")
	}

	// ...and the new version must have been started (it writes its proof).
	deadline = time.Now().Add(10 * time.Second)
	for {
		if _, err := os.Stat(filepath.Join(proofDir, "proof.txt")); err == nil {
			break
		}
		if time.Now().After(deadline) {
			t.Fatal("the restarted binary did not run")
		}
		time.Sleep(100 * time.Millisecond)
	}

	logData, err := os.ReadFile(logPath)
	if err != nil {
		t.Fatal(err)
	}
	for _, expected := range []string{"helper started", "replacing", "starting the new version", "done"} {
		if !strings.Contains(string(logData), expected) {
			t.Fatalf("log is missing %q\n--- log ---\n%s", expected, logData)
		}
	}
}

func mustRead(t *testing.T, path string) []byte {
	t.Helper()
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	return data
}
