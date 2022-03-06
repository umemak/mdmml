package main

import (
	"flag"
	"fmt"
	"os"

	"github.com/umemak/mdmml"
)

func main() {
	flag.Parse()
	err := run(flag.Arg(0))
	if err != nil {
		fmt.Printf("%+v\n", err)
		os.Exit(1)
	}
}

func run(fname string) error {
	src, err := os.ReadFile(fname)
	if err != nil {
		return err
	}
	_, err = os.Stdout.Write(mdmml.MDtoMML(src).MMLtoSMF().SMF())
	if err != nil {
		return err
	}
	return nil
}
