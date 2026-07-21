package main

import (
	"embed"
	"fmt"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/mac"
	"github.com/wailsapp/wails/v2/pkg/options/windows"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	app := NewApp()
	err := wails.Run(&options.App{
		Title:            appNameZH,
		Width:            1440,
		Height:           920,
		MinWidth:         920,
		MinHeight:        620,
		Frameless:        true,
		AssetServer:      &assetserver.Options{Assets: assets},
		BackgroundColour: &options.RGBA{R: 246, G: 244, B: 239, A: 255},
		OnStartup:        app.startup,
		OnBeforeClose:    app.beforeClose,
		SingleInstanceLock: &options.SingleInstanceLock{
			UniqueId:               "com.liuhang.md-reader-assistant",
			OnSecondInstanceLaunch: app.onSecondInstanceLaunch,
		},
		DragAndDrop: &options.DragAndDrop{EnableFileDrop: true, DisableWebViewDrop: false},
		Windows: &windows.Options{
			Theme: windows.SystemDefault, DisableFramelessWindowDecorations: false,
			IsZoomControlEnabled: false, DisablePinchZoom: true,
		},
		Mac:  &mac.Options{TitleBar: mac.TitleBarHiddenInset(), OnFileOpen: app.onFileOpen},
		Bind: []interface{}{app},
	})
	if err != nil {
		fmt.Println("Error:", err)
	}
}
