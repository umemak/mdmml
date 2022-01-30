package main

import (
	"fmt"
	"os"

	"github.com/umemak/mdmml"
)

func main() {
	src, err := os.ReadFile(os.Args[1])
	if err != nil {
		fmt.Printf("%+v\n", err)
		os.Exit(1)
	}
	_, err = os.Stdout.Write(mdmml.MDtoMML(src).MMLtoSMF().SMF())
	if err != nil {
		fmt.Printf("%+v\n", err)
		os.Exit(1)
	}
}
