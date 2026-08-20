//go:build !darwin || !cgo

package main

func createMacSecurityScopedBookmark(string) (string, error) {
	return "", nil
}

func startAccessingMacSecurityScopedBookmark(string) (string, bool, func(), error) {
	return "", false, func() {}, nil
}
