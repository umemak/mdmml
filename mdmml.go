package mdmml

import (
	"bytes"
	"strings"
)

type MDMML struct {
	header    []byte
	Conductor Track
	Tracks    []Track
}

type Track struct {
	name string
	mml  string
	smf  []byte
}

func NewMDMML(src []byte) *MDMML {
	mm := &MDMML{}
	mm.header = []byte{
		0x4D, 0x54, 0x68, 0x64, // "MThd"
		0x00, 0x00, 0x00, 0x06, // Length
		0x00, 0x01, // Format
		0x00, 0x03, // Tracks
		0x03, 0xC0, // Divisions(960)
	}
	mm.Conductor = Track{
		name: "Conductor",
		smf: []byte{
			0x4D, 0x54, 0x72, 0x6B, // "MTrk"
			0x00, 0x00, 0x00, 0x17, // Length
			0x00, 0xFF, 0x03, 0x00, // Title
			0x00, 0xFF, 0x51, 0x03, 0x06, 0x8A, 0x1B, // Tempo
			0x00, 0xFF, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08, // 4/4
			0x00, 0xFF, 0x2F, 0x00, // EOT
		},
	}
	mm.Tracks = append(mm.Tracks, Track{
		name: "A",
		smf: []byte{
			0x4D, 0x54, 0x72, 0x6B, // "MTrk"
			0x00, 0x00, 0x00, 0x2B, // Length
			0x00, 0xFF, 0x03, 0x00, // Title
			0x00, 0xFF, 0x21, 0x01, 0x00, // port
			0x00, 0xB0, 0x79, 0x00, // CC#121(Reset)
			0x00, 0xB0, 0x00, 0x00, // CC#0(MSB)
			0x00, 0xB0, 0x20, 0x00, // CC#32(LSB)
			0x00, 0xC0, 0x28, // Program Change
			0x00, 0xB0, 0x07, 0x64, // CC#7(Volume)
			0x9E, 0x00, 0x90, 0x3C, 0x64, // Note ON
			0x9E, 0x00, 0x80, 0x3C, 0x00, // Note OFF
			0x9E, 0x00, 0xFF, 0x2F, 0x00, //EOT
		},
	})
	mm.Tracks = append(mm.Tracks, Track{
		name: "B",
		smf: []byte{
			0x4D, 0x54, 0x72, 0x6B, // "MTrk"
			0x00, 0x00, 0x00, 0x29, // Length
			0x00, 0xFF, 0x03, 0x00, // Title
			0x00, 0xFF, 0x21, 0x01, 0x00, // port
			0x00, 0xB0, 0x79, 0x00, // CC#121(Reset)
			0x00, 0xB0, 0x00, 0x00, // CC#0(MSB)
			0x00, 0xB0, 0x20, 0x00, // CC#32(LSB)
			0x00, 0xC0, 0x28, // Program Change
			0x00, 0xB0, 0x07, 0x64, // CC#7(Volume)
			0x00, 0x90, 0x3E, 0x64, // Note ON
			0x9E, 0x00, 0x80, 0x3E, 0x00, // Note OFF
			0x00, 0xFF, 0x2F, 0x00, //EOT
		},
	})

	return mm
}

func (mm *MDMML) SMF() []byte {
	smf := mm.header
	smf = append(smf, mm.Conductor.smf...)
	for _, v := range mm.Tracks {
		smf = append(smf, v.smf...)
	}
	return smf
}

func parse(src []byte) *MDMML {
	mm := &MDMML{}
	lines := bytes.Split(src, []byte("\n"))
	for i := 0; i < len(lines); i++ {
		if string(lines[i]) == "---" {
			// Front Matter
			i++
			for ; i < len(lines); i++ {
				if string(lines[i]) == "---" {
					break
				}
				items := strings.Split(string(lines[i]), ":")
				if len(items) > 2 {
					items[1] = strings.Join(items[1:], ":")
				} else if len(items) != 2 {
					continue
				}
			}
		}
		if bytes.HasPrefix(lines[i], []byte("|")) {
			// Table
			i++
			i++ // Skip header
			for ; i < len(lines); i++ {
				items := strings.Split(string(lines[i]), "|")
				if len(items) < 2 {
					continue
				}
				name := strings.Trim(items[1], " ")
				mml := ""
				for _, ii := range items[2:] {
					mml += strings.Trim(ii, " ")
				}
				found := false
				for i, v := range mm.Tracks {
					if v.name == name {
						mm.Tracks[i].mml += mml
						found = true
						break
					}
				}
				if !found {
					mm.Tracks = append(mm.Tracks, Track{
						name: name,
						mml:  mml,
					})
				}
			}
		}
	}
	return mm
}
