package main

import (
	"flag"
	"fmt"
	"os"

	"github.com/umemak/mdmml"
)

func main() {
	flag.Parse()
	src, err := os.ReadFile(flag.Arg(0))
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
