package mdmml

import (
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestMDMML_SMF(t *testing.T) {
	tests := []struct {
		name     string
		filename string
		want     []byte
	}{
		{name: "normal", filename: "./testdata/test.md", want: []byte{
			// Header
			0x4D, 0x54, 0x68, 0x64, // "MThd"
			0x00, 0x00, 0x00, 0x06, // Length
			0x00, 0x01, // Format
			0x00, 0x03, // Tracks
			0x03, 0xC0, // Divisions(960)
			// Conductor
			0x4D, 0x54, 0x72, 0x6B, // "MTrk"
			0x00, 0x00, 0x00, 0x20, // Length
			0x00, 0xFF, 0x03, 0x09, 0xe3, 0x83, 0x86, 0xe3, 0x82, 0xb9, 0xe3, 0x83, 0x88, // Title
			0x00, 0xFF, 0x51, 0x03, 0x07, 0xA1, 0x20, // Tempo
			0x00, 0xFF, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08, // 4/4
			0x00, 0xFF, 0x2F, 0x00, // EOT
			// Track A
			0x4D, 0x54, 0x72, 0x6B, // "MTrk"
			0x00, 0x00, 0x00, 0xB5, // Length
			0x00, 0xFF, 0x03, 0x00, // Title
			0x00, 0xFF, 0x20, 0x01, 0x00, // channel
			0x00, 0xFF, 0x21, 0x01, 0x00, // port
			0x00, 0xB0, 0x79, 0x00, // CC#121(Reset)
			0x00, 0xB0, 0x07, 0x64, // CC#7(Volume)
			0x00, 0xb0, 0x00, 0x00,
			0x00, 0xb0, 0x20, 0x00,
			0x00, 0xc0, 0x09,
			0x00, 0x90, 0x3c, 0x64, 0x83, 0x60, 0x80, 0x3c, 0x00,
			0x00, 0x90, 0x3e, 0x64, 0x83, 0x60, 0x80, 0x3e, 0x00,
			0x00, 0x90, 0x40, 0x64, 0x83, 0x60, 0x80, 0x40, 0x00,
			0x00, 0x90, 0x41, 0x64, 0x83, 0x60, 0x80, 0x41, 0x00,
			0x00, 0x90, 0x43, 0x64, 0x83, 0x60, 0x80, 0x43, 0x00,
			0x00, 0x90, 0x45, 0x64, 0x83, 0x60, 0x80, 0x45, 0x00,
			0x00, 0x90, 0x47, 0x64, 0x83, 0x60, 0x80, 0x47, 0x00,
			0x00, 0x90, 0x48, 0x64, 0x83, 0x60, 0x80, 0x48, 0x00,
			0x00, 0x90, 0x48, 0x64, 0x83, 0x60, 0x80, 0x48, 0x00,
			0x00, 0x90, 0x47, 0x64, 0x83, 0x60, 0x80, 0x47, 0x00,
			0x00, 0x90, 0x45, 0x64, 0x83, 0x60, 0x80, 0x45, 0x00,
			0x00, 0x90, 0x43, 0x64, 0x83, 0x60, 0x80, 0x43, 0x00,
			0x00, 0x90, 0x41, 0x64, 0x83, 0x60, 0x80, 0x41, 0x00,
			0x00, 0x90, 0x40, 0x64, 0x83, 0x60, 0x80, 0x40, 0x00,
			0x00, 0x90, 0x3e, 0x64, 0x83, 0x60, 0x80, 0x3e, 0x00,
			0x00, 0x90, 0x3c, 0x64, 0x83, 0x60, 0x80, 0x3c, 0x00,
			0x00, 0xFF, 0x2F, 0x00, //EOT
			// Track B
			0x4D, 0x54, 0x72, 0x6B, // "MTrk"
			0x00, 0x00, 0x00, 0xB5, // Length
			0x00, 0xFF, 0x03, 0x00, // Title
			0x00, 0xFF, 0x20, 0x01, 0x01, // channel
			0x00, 0xFF, 0x21, 0x01, 0x01, // port
			0x00, 0xB1, 0x79, 0x00, // CC#121(Reset)
			0x00, 0xB1, 0x07, 0x64, // CC#7(Volume)
			0x00, 0xb1, 0x00, 0x00,
			0x00, 0xb1, 0x20, 0x00,
			0x00, 0xc1, 0x13,
			0x00, 0x91, 0x40, 0x64, 0x83, 0x60, 0x81, 0x40, 0x00,
			0x00, 0x91, 0x41, 0x64, 0x83, 0x60, 0x81, 0x41, 0x00,
			0x00, 0x91, 0x43, 0x64, 0x83, 0x60, 0x81, 0x43, 0x00,
			0x00, 0x91, 0x45, 0x64, 0x83, 0x60, 0x81, 0x45, 0x00,
			0x00, 0x91, 0x47, 0x64, 0x83, 0x60, 0x81, 0x47, 0x00,
			0x00, 0x91, 0x48, 0x64, 0x83, 0x60, 0x81, 0x48, 0x00,
			0x00, 0x91, 0x4a, 0x64, 0x83, 0x60, 0x81, 0x4a, 0x00,
			0x00, 0x91, 0x4c, 0x64, 0x83, 0x60, 0x81, 0x4c, 0x00,
			0x00, 0x91, 0x4c, 0x64, 0x83, 0x60, 0x81, 0x4c, 0x00,
			0x00, 0x91, 0x4a, 0x64, 0x83, 0x60, 0x81, 0x4a, 0x00,
			0x00, 0x91, 0x48, 0x64, 0x83, 0x60, 0x81, 0x48, 0x00,
			0x00, 0x91, 0x47, 0x64, 0x83, 0x60, 0x81, 0x47, 0x00,
			0x00, 0x91, 0x45, 0x64, 0x83, 0x60, 0x81, 0x45, 0x00,
			0x00, 0x91, 0x43, 0x64, 0x83, 0x60, 0x81, 0x43, 0x00,
			0x00, 0x91, 0x41, 0x64, 0x83, 0x60, 0x81, 0x41, 0x00,
			0x00, 0x91, 0x40, 0x64, 0x83, 0x60, 0x81, 0x40, 0x00,
			0x00, 0xFF, 0x2F, 0x00, //EOT
		}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			src, _ := os.ReadFile(tt.filename)
			mm := MDtoMML(src).MMLtoSMF()
			got := mm.SMF()
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestMDtoMML(t *testing.T) {
	tests := []struct {
		name     string
		src      []byte
		filename string
		want     *MDMML
	}{
		{name: "normal", filename: "./testdata/test.md", want: &MDMML{
			divisions: 960,
			title:     "テスト",
			tempo:     120,
			Tracks: []Track{
				{name: "A", mmls: []string{"@10cdef", "gab>c", "c<bag", "fedc"}},
				{name: "B", mmls: []string{"@20efga", "b>cde", "edc<b", "agfe"}},
			},
		}},
		{name: "colon in title", src: []byte("---\nTitle:te:st\n---\n"), want: &MDMML{divisions: 960, title: "te:st", tempo: 120}},
		{name: "divisions", src: []byte("---\nDivisions:240\n---\n"), want: &MDMML{divisions: 240, tempo: 120}},
		{name: "divisions error", src: []byte("---\nDivisions:AAA\n---\n"), want: &MDMML{divisions: 960, tempo: 120}},
		{name: "tempo", src: []byte("---\nTempo:200\n---\n"), want: &MDMML{divisions: 960, tempo: 200}},
		{name: "tempo error", src: []byte("---\nTempo:AAA\n---\n"), want: &MDMML{divisions: 960, tempo: 120}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			src := tt.src
			if tt.filename != "" {
				src, _ = os.ReadFile(tt.filename)
			}
			got := MDtoMML(src)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestMDMML_noteOnOff(t *testing.T) {
	type args struct {
		ch   int
		oct  int
		note string
		vel  int
		len  int
	}
	tests := []struct {
		name string
		args args
		want []byte
	}{
		{name: "v100l8o4c", args: args{ch: 1, oct: 4, note: "c", vel: 100, len: 4}, want: []byte{
			0x00, 0x91, 0x3c, 0x64, // Note ON
			0x87, 0x40, 0x81, 0x3c, 0x00, // Note OFF
		}},
		{name: "rest", args: args{ch: 1, oct: 4, note: "r", vel: 100, len: 4}, want: []byte{
			0x00, 0x91, 0x00, 0x00, // Note ON
			0x87, 0x40, 0x81, 0x00, 0x00, // Note OFF
		}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mm := &MDMML{
				divisions: 960,
			}
			got := mm.noteOnOff(tt.args.ch, tt.args.oct, tt.args.note, tt.args.vel, mm.lenToTick(tt.args.len))
			assert.Equal(t, tt.want, got)
		})
	}
}

func Test_itob(t *testing.T) {
	type args struct {
		i int
		f int
	}
	tests := []struct {
		name string
		args args
		want []byte
	}{
		{name: "<128", args: args{i: 127}, want: []byte{0x7f}},
		{name: "<16384", args: args{i: 16383}, want: []byte{0xff, 0x7f}},
		{name: "<2097152", args: args{i: 2097151}, want: []byte{0xff, 0xff, 0x7f}},
		{name: "<268435456", args: args{i: 268435455}, want: []byte{0xff, 0xff, 0xff, 0x7f}},
		{name: ">=268435456", args: args{i: 268435456}, want: []byte{}},
		{name: "<128 fix4", args: args{i: 127, f: 4}, want: []byte{0x00, 0x00, 0x00, 0x7f}},
		{name: "<16384 fix4", args: args{i: 16383, f: 4}, want: []byte{0x00, 0x00, 0xff, 0x7f}},
		{name: "<2097152 fix4", args: args{i: 2097151, f: 4}, want: []byte{0x00, 0xff, 0xff, 0x7f}},
		{name: "<268435456 fix4", args: args{i: 268435455, f: 4}, want: []byte{0xff, 0xff, 0xff, 0x7f}},
		{name: "<268435456 fix5", args: args{i: 268435455, f: 5}, want: []byte{0x00, 0xff, 0xff, 0xff, 0x7f}},
		{name: ">=268435456 fix4", args: args{i: 268435456, f: 4}, want: []byte{}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := itob(tt.args.i, tt.args.f)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestMDMML_lenToTick(t *testing.T) {
	type fields struct {
		divisions int
		header    []byte
		Conductor Track
		Tracks    []Track
	}
	type args struct {
		len int
	}
	tests := []struct {
		name   string
		fields fields
		args   args
		want   int
	}{
		{name: "div960 len8", fields: fields{divisions: 960}, args: args{len: 8}, want: 480},
		{name: "div960 len4", fields: fields{divisions: 960}, args: args{len: 4}, want: 960},
		{name: "div480 len8", fields: fields{divisions: 480}, args: args{len: 8}, want: 240},
		{name: "div480 len4", fields: fields{divisions: 480}, args: args{len: 4}, want: 480},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mm := &MDMML{
				divisions: tt.fields.divisions,
				header:    tt.fields.header,
				Conductor: tt.fields.Conductor,
				Tracks:    tt.fields.Tracks,
			}
			got := mm.lenToTick(tt.args.len)
			assert.Equal(t, tt.want, got)
		})
	}
}

func Test_num(t *testing.T) {
	type args struct {
		s   string
		min int
		max int
	}
	tests := []struct {
		name  string
		args  args
		want  int
		want1 int
	}{
		{name: "1桁", args: args{s: "1a", min: 1, max: 10}, want: 1, want1: 1},
		{name: "2桁", args: args{s: "12a", min: 1, max: 15}, want: 12, want1: 2},
		{name: "min", args: args{s: "12a", min: 20, max: 30}, want: 20, want1: 2},
		{name: "max", args: args{s: "12a", min: 1, max: 10}, want: 10, want1: 2},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, got1 := num(tt.args.s, tt.args.min, tt.args.max)
			if got != tt.want {
				t.Errorf("num() got = %v, want %v", got, tt.want)
			}
			if got1 != tt.want1 {
				t.Errorf("num() got1 = %v, want %v", got1, tt.want1)
			}
		})
	}
}

func TestMDMML_toSMF(t *testing.T) {
	type args struct {
		mml string
	}
	tests := []struct {
		name string
		args args
		want []byte
	}{
		{name: "normal", args: args{mml: "cde"}, want: []byte{
			0x4d, 0x54, 0x72, 0x6b,
			0x00, 0x00, 0x00, 0x35,
			0x00, 0xff, 0x03, 0x00,
			0x00, 0xff, 0x20, 0x01, 0x00,
			0x00, 0xff, 0x21, 0x01, 0x00,
			0x00, 0xb0, 0x79, 0x00,
			0x00, 0xb0, 0x07, 0x64,
			0x00, 0x90, 0x3c, 0x64, 0x83, 0x60, 0x80, 0x3c, 0x00,
			0x00, 0x90, 0x3e, 0x64, 0x83, 0x60, 0x80, 0x3e, 0x00,
			0x00, 0x90, 0x40, 0x64, 0x83, 0x60, 0x80, 0x40, 0x00,
			0x00, 0xff, 0x2f, 0x00,
		}},
		{name: "dot", args: args{mml: "l4c.c8"}, want: []byte{
			0x4d, 0x54, 0x72, 0x6b,
			0x00, 0x00, 0x00, 0x2c,
			0x00, 0xff, 0x03, 0x00,
			0x00, 0xff, 0x20, 0x01, 0x00,
			0x00, 0xff, 0x21, 0x01, 0x00,
			0x00, 0xb0, 0x79, 0x00,
			0x00, 0xb0, 0x07, 0x64,
			0x00, 0x90, 0x3c, 0x64, 0x8b, 0x20, 0x80, 0x3c, 0x00, // 0x81 0x70 = 240 = l4
			0x00, 0x90, 0x3c, 0x64, 0x83, 0x60, 0x80, 0x3c, 0x00, // 0x83 0x60 = 480 = l8
			0x00, 0xff, 0x2f, 0x00,
		}},
		{name: "chode", args: args{mml: "{ceg}4"}, want: []byte{
			0x4d, 0x54, 0x72, 0x6b,
			0x00, 0x00, 0x00, 0x33,
			0x00, 0xff, 0x03, 0x00,
			0x00, 0xff, 0x20, 0x01, 0x00,
			0x00, 0xff, 0x21, 0x01, 0x00,
			0x00, 0xb0, 0x79, 0x00,
			0x00, 0xb0, 0x07, 0x64,
			0x00, 0x90, 0x3c, 0x64,
			0x00, 0x90, 0x40, 0x64,
			0x00, 0x90, 0x43, 0x64,
			0x87, 0x40, 0x80, 0x3c, 0x00,
			0x00, 0x80, 0x40, 0x00,
			0x00, 0x80, 0x43, 0x00,
			0x00, 0xff, 0x2f, 0x00,
		}},
		{name: "chode2", args: args{mml: "c>c<{c>c}4"}, want: []byte{
			0x4d, 0x54, 0x72, 0x6b,
			0x00, 0x00, 0x00, 0x3d,
			0x00, 0xff, 0x03, 0x00,
			0x00, 0xff, 0x20, 0x01, 0x00,
			0x00, 0xff, 0x21, 0x01, 0x00,
			0x00, 0xb0, 0x79, 0x00,
			0x00, 0xb0, 0x07, 0x64,
			0x00, 0x90, 0x3c, 0x64, 0x83, 0x60, 0x80, 0x3c, 0x00,
			0x00, 0x90, 0x48, 0x64, 0x83, 0x60, 0x80, 0x48, 0x00,
			0x00, 0x90, 0x3c, 0x64,
			0x00, 0x90, 0x48, 0x64,
			0x87, 0x40, 0x80, 0x3c, 0x00,
			0x00, 0x80, 0x48, 0x00,
			0x00, 0xff, 0x2f, 0x00,
		}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mm := &MDMML{
				divisions: 960,
			}
			events := mm.toEvents(tt.args.mml, 0)
			got := buildSMF(events, 0)
			assert.Equal(t, tt.want, got)
		})
	}
}

func Test_tempoMs(t *testing.T) {
	type args struct {
		t int
	}
	tests := []struct {
		name string
		args args
		want int
	}{
		{name: "bpm120", args: args{t: 120}, want: 500000},
		{name: "bpm140", args: args{t: 140}, want: 428571},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tempoMs(tt.args.t); got != tt.want {
				t.Errorf("tempoMs() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestMDMML_MMLtoSMF(t *testing.T) {
	type fields struct {
		divisions int
		title     string
		tempo     int
		header    []byte
		Conductor Track
		Tracks    []Track
	}
	tests := []struct {
		name   string
		fields fields
		want   *MDMML
	}{
		{name: "default", want: &MDMML{
			divisions: 0, title: "", tempo: 0,
			header: []uint8{
				0x4d, 0x54, 0x68, 0x64,
				0x0, 0x0, 0x0, 0x6,
				0x0, 0x1, 0x0, 0x1, 0x0, 0x0,
			},
			Conductor: Track{name: "Conductor", mmls: []string(nil),
				smf: []uint8{
					0x4d, 0x54, 0x72, 0x6b,
					0x0, 0x0, 0x0, 0x17,
					0x0, 0xff, 0x3, 0x0,
					0x0, 0xff, 0x51, 0x3, 0x0, 0x0, 0x0,
					0x0, 0xff, 0x58, 0x4, 0x4, 0x2, 0x18, 0x8,
					0x0, 0xff, 0x2f, 0x0,
				}},
			Tracks: []Track(nil)}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mm := &MDMML{
				divisions: tt.fields.divisions,
				title:     tt.fields.title,
				tempo:     tt.fields.tempo,
				header:    tt.fields.header,
				Conductor: tt.fields.Conductor,
				Tracks:    tt.fields.Tracks,
			}
			got := mm.MMLtoSMF()
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestMDMML_toEvents(t *testing.T) {
	type args struct {
		mml string
		ch  int
	}
	tests := []struct {
		name string
		args args
		want []byte
	}{
		{name: "default", want: []byte{}},
		{name: "note", args: args{mml: "cdefgab"}, want: []byte{
			0x0, 0x90, 0x3c, 0x64, 0x83, 0x60, 0x80, 0x3c, 0x0,
			0x0, 0x90, 0x3e, 0x64, 0x83, 0x60, 0x80, 0x3e, 0x0,
			0x0, 0x90, 0x40, 0x64, 0x83, 0x60, 0x80, 0x40, 0x0,
			0x0, 0x90, 0x41, 0x64, 0x83, 0x60, 0x80, 0x41, 0x0,
			0x0, 0x90, 0x43, 0x64, 0x83, 0x60, 0x80, 0x43, 0x0,
			0x0, 0x90, 0x45, 0x64, 0x83, 0x60, 0x80, 0x45, 0x0,
			0x0, 0x90, 0x47, 0x64, 0x83, 0x60, 0x80, 0x47, 0x0,
		}},
		{name: "note+-", args: args{mml: "dd+d#d-"}, want: []byte{
			0x0, 0x90, 0x3e, 0x64, 0x83, 0x60, 0x80, 0x3e, 0x0,
			0x0, 0x90, 0x3f, 0x64, 0x83, 0x60, 0x80, 0x3f, 0x0,
			0x0, 0x90, 0x3f, 0x64, 0x83, 0x60, 0x80, 0x3f, 0x0,
			0x0, 0x90, 0x3d, 0x64, 0x83, 0x60, 0x80, 0x3d, 0x0,
		}},
		{name: "len", args: args{mml: "l4ee8e.e8^8."}, want: []byte{
			0x0, 0x90, 0x40, 0x64, 0x87, 0x40, 0x80, 0x40, 0x0,
			0x0, 0x90, 0x40, 0x64, 0x83, 0x60, 0x80, 0x40, 0x0,
			0x0, 0x90, 0x40, 0x64, 0x8b, 0x20, 0x80, 0x40, 0x0,
			0x0, 0x90, 0x40, 0x64, 0x89, 0x30, 0x80, 0x40, 0x0,
		}},
		{name: "chode", args: args{mml: "{c+e-g#>c<}4.^8."}, want: []byte{
			0x0, 0x90, 0x3d, 0x64,
			0x0, 0x90, 0x3f, 0x64,
			0x0, 0x90, 0x44, 0x64,
			0x0, 0x90, 0x48, 0x64,
			0x9c, 0x10, 0x80, 0x3d, 0x0,
			0x0, 0x80, 0x3f, 0x0,
			0x0, 0x80, 0x44, 0x0,
			0x0, 0x80, 0x48, 0x0,
		}},
		{name: "oct", args: args{mml: "o4co5c<c>c"}, want: []byte{
			0x0, 0x90, 0x3c, 0x64, 0x83, 0x60, 0x80, 0x3c, 0x0,
			0x0, 0x90, 0x48, 0x64, 0x83, 0x60, 0x80, 0x48, 0x0,
			0x0, 0x90, 0x3c, 0x64, 0x83, 0x60, 0x80, 0x3c, 0x0,
			0x0, 0x90, 0x48, 0x64, 0x83, 0x60, 0x80, 0x48, 0x0,
		}},
		{name: "program", args: args{mml: "@0@1@128@129"}, want: []byte{
			0x0, 0xb0, 0x0, 0x0, 0x0, 0xb0, 0x20, 0x0, 0x0, 0xc0, 0,
			0x0, 0xb0, 0x0, 0x0, 0x0, 0xb0, 0x20, 0x0, 0x0, 0xc0, 0,
			0x0, 0xb0, 0x0, 0x0, 0x0, 0xb0, 0x20, 0x0, 0x0, 0xc0, 127,
			0x0, 0xb0, 0x0, 0x0, 0x0, 0xb0, 0x20, 0x0, 0x0, 0xc0, 127,
		}},
		{name: "pan", args: args{mml: "p0p63p127p128"}, want: []byte{
			0x0, 0xb0, 0xa, 0,
			0x0, 0xb0, 0xa, 63,
			0x0, 0xb0, 0xa, 127,
			0x0, 0xb0, 0xa, 127,
		}},
		{name: "tempo", args: args{mml: "t0t120t250"}, want: []byte{
			0x0, 0xff, 0x51, 0x3, 0x3, 0x93, 0x87, 0x0,
			0x0, 0xff, 0x51, 0x3, 0x7, 0xa1, 0x20,
			0x0, 0xff, 0x51, 0x3, 0x3, 0xa9, 0x80,
		}},
		{name: "vel", args: args{mml: "v0cv1cv127cv128c"}, want: []byte{
			0x0, 0x90, 0x3c, 0x0, 0x83, 0x60, 0x80, 0x3c, 0x0,
			0x0, 0x90, 0x3c, 0x1, 0x83, 0x60, 0x80, 0x3c, 0x0,
			0x0, 0x90, 0x3c, 0x7f, 0x83, 0x60, 0x80, 0x3c, 0x0,
			0x0, 0x90, 0x3c, 0x7f, 0x83, 0x60, 0x80, 0x3c, 0x0,
		}},
		{name: "ch", args: args{mml: "$0c$1c$15c$16c"}, want: []byte{
			0x0, 0x90, 0x3c, 0x64, 0x83, 0x60, 0x80, 0x3c, 0x0,
			0x0, 0x90, 0x3c, 0x64, 0x83, 0x60, 0x80, 0x3c, 0x0,
			0x0, 0x9e, 0x3c, 0x64, 0x83, 0x60, 0x8e, 0x3c, 0x0,
			0x0, 0x9f, 0x3c, 0x64, 0x83, 0x60, 0x8f, 0x3c, 0x0,
		}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mm := &MDMML{
				divisions: 960,
				tempo:     120,
			}
			got := mm.toEvents(tt.args.mml, tt.args.ch)
			assert.Equal(t, tt.want, got)
		})
	}
}

func Test_buildSMF(t *testing.T) {
	type args struct {
		events []byte
		ch     int
	}
	tests := []struct {
		name string
		args args
		want []byte
	}{
		{name: "default", want: []byte{
			0x4d, 0x54, 0x72, 0x6b,
			0x0, 0x0, 0x0, 0x1a,
			0x0, 0xff, 0x3, 0x0,
			0x0, 0xff, 0x20, 0x1, 0x0,
			0x0, 0xff, 0x21, 0x1, 0x0,
			0x0, 0xb0, 0x79, 0x0,
			0x0, 0xb0, 0x7, 0x64,
			0x0, 0xff, 0x2f, 0x0,
		}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := buildSMF(tt.args.events, tt.args.ch)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestMDMML_notesOnOff(t *testing.T) {
	type fields struct {
		divisions int
		title     string
		tempo     int
		header    []byte
		Conductor Track
		Tracks    []Track
	}
	type args struct {
		ch    int
		notes []note
		tick  int
	}
	tests := []struct {
		name   string
		fields fields
		args   args
		want   []byte
	}{
		{name: "default", want: []byte{}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mm := &MDMML{
				divisions: tt.fields.divisions,
				title:     tt.fields.title,
				tempo:     tt.fields.tempo,
				header:    tt.fields.header,
				Conductor: tt.fields.Conductor,
				Tracks:    tt.fields.Tracks,
			}
			got := mm.notesOnOff(tt.args.ch, tt.args.notes, tt.args.tick)
			assert.Equal(t, tt.want, got)
		})
	}
}

func Test_noteNum(t *testing.T) {
	type args struct {
		oct  int
		note string
	}
	tests := []struct {
		name string
		args args
		want int
	}{
		{name: "default"},
		{name: "o4c", args: args{oct: 4, note: "c"}, want: 60},
		{name: "rest", args: args{oct: 4, note: "r"}, want: -1},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := noteNum(tt.args.oct, tt.args.note)
			assert.Equal(t, tt.want, got)
		})
	}
}

func Test_event(t *testing.T) {
	type args struct {
		dt  int
		ev  int
		n   int
		vel int
	}
	tests := []struct {
		name string
		args args
		want []byte
	}{
		{name: "default", want: []byte{0x0, 0x0, 0x0, 0x0}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := event(tt.args.dt, tt.args.ev, tt.args.n, tt.args.vel)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestMDMML_programChange(t *testing.T) {
	type fields struct {
		divisions int
		title     string
		tempo     int
		header    []byte
		Conductor Track
		Tracks    []Track
	}
	type args struct {
		ch int
		p  int
	}
	tests := []struct {
		name   string
		fields fields
		args   args
		want   []byte
	}{
		{name: "default", want: []byte{0x0, 0xb0, 0x0, 0x0, 0x0, 0xb0, 0x20, 0x0, 0x0, 0xc0, 0xff}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mm := &MDMML{
				divisions: tt.fields.divisions,
				title:     tt.fields.title,
				tempo:     tt.fields.tempo,
				header:    tt.fields.header,
				Conductor: tt.fields.Conductor,
				Tracks:    tt.fields.Tracks,
			}
			got := mm.programChange(tt.args.ch, tt.args.p)
			assert.Equal(t, tt.want, got)
		})
	}
}

func Test_cc(t *testing.T) {
	type args struct {
		dt  int
		ch  int
		num int
		val int
	}
	tests := []struct {
		name string
		args args
		want []byte
	}{
		{name: "default", want: []byte{0x0, 0xb0, 0x0, 0x0}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := cc(tt.args.dt, tt.args.ch, tt.args.num, tt.args.val)
			assert.Equal(t, tt.want, got)
		})
	}
}

func Test_itofb(t *testing.T) {
	type args struct {
		i int
		f int
	}
	tests := []struct {
		name string
		args args
		want []byte
	}{
		{name: "default", want: []byte{0x0}},
		{name: "i<256 f1", args: args{i: 255, f: 1}, want: []byte{0xff}},
		{name: "i<256 f2", args: args{i: 255, f: 2}, want: []byte{0x00, 0xff}},
		{name: "i<65536 f1", args: args{i: 65535, f: 1}, want: []byte{0xff, 0xff}},
		{name: "i<65536 f3", args: args{i: 65535, f: 3}, want: []byte{0x00, 0xff, 0xff}},
		{name: "i<16777216 f1", args: args{i: 16777215, f: 1}, want: []byte{0xff, 0xff, 0xff}},
		{name: "i<16777216 f4", args: args{i: 16777215, f: 4}, want: []byte{0x00, 0xff, 0xff, 0xff}},
		{name: "i<4294967296 f1", args: args{i: 4294967295, f: 1}, want: []byte{0xff, 0xff, 0xff, 0xff}},
		{name: "i<4294967296 f5", args: args{i: 4294967295, f: 5}, want: []byte{0x00, 0xff, 0xff, 0xff, 0xff}},
		{name: "i<=4294967296 f1", args: args{i: 4294967296, f: 1}, want: []byte{}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := itofb(tt.args.i, tt.args.f)
			assert.Equal(t, tt.want, got)
		})
	}
}

func Test_expand(t *testing.T) {
	type args struct {
		mml string
	}
	tests := []struct {
		name string
		args args
		want string
	}{
		{name: "normal", args: args{mml: "cde"}, want: "cde"},
		{name: "loop", args: args{mml: "cr[cr][rd]3rd"}, want: "crcrcrrdrdrdrd"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := expand(tt.args.mml)
			assert.Equal(t, tt.want, got)
		})
	}
}
