package mdmml

import (
	"bytes"
	"encoding/binary"
	"fmt"
	"strconv"
	"strings"
)

type MDMML struct {
	divisions int
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

func MDtoMML(src []byte) *MDMML {
	fmt.Printf("%s", src)
	mm := &MDMML{}
	lines := bytes.Split(src, []byte("\n"))
	for i := 0; i < len(lines); i++ {
		if string(lines[i]) == "---" { // Front Matter
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
				if items[0] == "Divisions" {
					divisions, err := strconv.Atoi(items[1])
					mm.divisions = divisions
					if err != nil {
						mm.divisions = 960
					}
				}
			}
		}
		if bytes.HasPrefix(lines[i], []byte("|")) { // Table
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

func (mm *MDMML) MMLtoSMF() *MDMML {
	for _, t := range mm.Tracks {
		fmt.Printf("t: %s: %s", t.name, t.mml)
		t.smf = mm.toSMF(t.mml)
	}
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
	return mm
}

func (mm *MDMML) toSMF(mml string) []byte {
	smf := []byte{}
	oct := 3
	vel := 100
	defL := 8
	for i := 0; i < len(mml); i++ {
		s := string(mml[i])
		if (s >= "a" && s <= "g") || (s >= "A" && s <= "G") { // note
			smf = append(smf, mm.noteOnOff(oct, s, vel, defL)...)
		} else if s == "o" || s == "O" { // octave
			i++
			o, l := num(string(mml[i]))
			if l > 0 {
				i = i + l
				oct = o
			}
		} else if s == ">" {
			oct++
		} else if s == "<" {
			oct--
		} else if s == "l" || s == "L" { // length
			i++
			o, l := num(string(mml[i]))
			if l > 0 {
				i = i + l
				defL = o
			}
		} else if s == "@" { // program
			i++
			o, l := num(string(mml[i]))
			if l > 0 {
				i = i + l
			}
			smf = append(smf, mm.programChange(o)...)
		} else if s == "v" { // velocity
			i++
			o, l := num(string(mml[i]))
			if l > 0 {
				i = i + l
				vel = o
			}
		}
	}
	return smf
}

func num(s string) (int, int) {
	ss := ""
	for _, v := range s {
		j := string(v)
		if j >= "0" && j <= "9" {
			ss = ss + j
		} else {
			break
		}
	}
	n, err := strconv.Atoi(ss)
	if err != nil {
		return 0, 0
	}
	return n, len(ss)
}

func (mm *MDMML) noteOnOff(oct int, note string, vel int, len int) []byte {
	cd := map[string]int{"c": 0, "d": 2, "e": 4, "f": 5, "g": 7, "a": 9, "b": 11}
	n := oct*12 + cd[note]
	ret := []byte{}
	ret = append(ret, []byte{0x00, 0x90}...)
	ret = append(ret, itob(n)...)
	ret = append(ret, itob(vel)...)
	ret = append(ret, itob(mm.lenToTick(len))...)
	ret = append(ret, []byte{0x00, 0x80}...)
	ret = append(ret, itob(n)...)
	ret = append(ret, []byte{0x00}...)
	return ret
}

func (mm *MDMML) programChange(p int) []byte {
	ret := []byte{}
	ret = append(ret, []byte{0x00, 0xC0}...)
	ret = append(ret, itob(p)...)
	return ret
}

// http://www13.plala.or.jp/kymats/study/MULTIMEDIA/midiStream_format.html
func itob(i int) []byte {
	ret := []byte{}
	buf := make([]byte, binary.MaxVarintLen64)
	if i < 128 {
		binary.BigEndian.PutUint64(buf, uint64(i))
		ret = append(ret, buf[7:8]...)
		return ret
	}
	if i < 16384 {
		binary.BigEndian.PutUint64(buf, uint64((i>>7)|0x80))
		ret = append(ret, buf[7:8]...)
		binary.BigEndian.PutUint64(buf, uint64(i&0x7f))
		ret = append(ret, buf[7:8]...)
		return ret
	}
	if i < 2097152 {
		binary.BigEndian.PutUint64(buf, uint64((i>>14)|0x80))
		ret = append(ret, buf[7:8]...)
		binary.BigEndian.PutUint64(buf, uint64((i>>7)|0x80))
		ret = append(ret, buf[7:8]...)
		binary.BigEndian.PutUint64(buf, uint64(i&0x7f))
		ret = append(ret, buf[7:8]...)
		return ret
	}
	if i < 268435456 {
		binary.BigEndian.PutUint64(buf, uint64((i>>21)|0x80))
		ret = append(ret, buf[7:8]...)
		binary.BigEndian.PutUint64(buf, uint64((i>>14)|0x80))
		ret = append(ret, buf[7:8]...)
		binary.BigEndian.PutUint64(buf, uint64((i>>7)|0x80))
		ret = append(ret, buf[7:8]...)
		binary.BigEndian.PutUint64(buf, uint64(i&0x7f))
		ret = append(ret, buf[7:8]...)
		return ret
	}
	return ret
}

func (mm *MDMML) lenToTick(len int) int {
	return mm.divisions / len
}
