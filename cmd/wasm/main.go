//go:build js && wasm

package main

import (
	"fmt"
	"syscall/js"

	"github.com/umemak/mdmml"
)

func convertMDtoSMF(this js.Value, args []js.Value) any {
	if len(args) == 0 {
		return map[string]any{
			"success": false,
			"error":   "Markdownの入力が空です",
		}
	}

	src := args[0].String()

	var result map[string]any
	defer func() {
		if r := recover(); r != nil {
			result = map[string]any{
				"success": false,
				"error":   fmt.Sprintf("変換エラー (パニック): %v", r),
			}
		}
	}()

	md := mdmml.MDtoMML([]byte(src))
	md.MMLtoSMF()
	smfBytes := md.SMF()

	dst := js.Global().Get("Uint8Array").New(len(smfBytes))
	js.CopyBytesToJS(dst, smfBytes)

	result = map[string]any{
		"success": true,
		"smf":     dst,
	}
	return result
}

func main() {
	c := make(chan struct{})
	js.Global().Set("mdmmlConvert", js.FuncOf(convertMDtoSMF))
	if readyCallback := js.Global().Get("onMdmmlWasmReady"); readyCallback.Type() == js.TypeFunction {
		readyCallback.Invoke()
	}
	<-c
}
