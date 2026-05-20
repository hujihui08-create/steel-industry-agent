package fileparser

import (
	"archive/zip"
	"bytes"
	"encoding/xml"
	"io"
	"strings"

	"github.com/ledongthuc/pdf"
)

// ParseFile extracts text content from a file based on its extension.
// Supported formats: .txt, .md, .pdf, .docx
func ParseFile(filename string, data []byte) (string, error) {
	lower := strings.ToLower(filename)

	switch {
	case strings.HasSuffix(lower, ".txt"), strings.HasSuffix(lower, ".md"):
		return string(data), nil

	case strings.HasSuffix(lower, ".pdf"):
		return parsePDF(data)

	case strings.HasSuffix(lower, ".docx"):
		return parseDOCX(data)

	default:
		// Try as plain text
		return string(data), nil
	}
}

// parsePDF extracts text from a PDF file using ledongthuc/pdf.
func parsePDF(data []byte) (string, error) {
	reader := bytes.NewReader(data)
	size := int64(len(data))

	pdfReader, err := pdf.NewReader(reader, size)
	if err != nil {
		return "", err
	}

	var buf strings.Builder
	numPages := pdfReader.NumPage()

	for i := 1; i <= numPages; i++ {
		page := pdfReader.Page(i)
		if page.V.IsNull() {
			continue
		}

		content := page.Content()
		for _, text := range content.Text {
			buf.WriteString(text.S)
			buf.WriteString(" ")
		}
		buf.WriteString("\n")
	}

	return strings.TrimSpace(buf.String()), nil
}

// parseDOCX extracts text from a DOCX file (which is a ZIP of XML).
func parseDOCX(data []byte) (string, error) {
	reader, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return "", err
	}

	// Find word/document.xml
	var docFile *zip.File
	for _, f := range reader.File {
		if f.Name == "word/document.xml" {
			docFile = f
			break
		}
	}
	if docFile == nil {
		return "", nil
	}

	rc, err := docFile.Open()
	if err != nil {
		return "", err
	}
	defer rc.Close()

	xmlData, err := io.ReadAll(rc)
	if err != nil {
		return "", err
	}

	return extractTextFromDocxXML(xmlData)
}

// DOCX namespace constants
const (
	nsW = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
)

// extractTextFromDocxXML parses the word/document.xml content and extracts text.
func extractTextFromDocxXML(data []byte) (string, error) {
	decoder := xml.NewDecoder(bytes.NewReader(data))

	var buf strings.Builder
	var inText bool

	for {
		tok, err := decoder.Token()
		if err == io.EOF {
			break
		}
		if err != nil {
			return buf.String(), nil
		}

		switch el := tok.(type) {
		case xml.StartElement:
			if el.Name.Local == "t" || el.Name.Local == "br" {
				inText = true
			}
			if el.Name.Local == "p" {
				buf.WriteString("\n")
			}
		case xml.EndElement:
			if el.Name.Local == "t" || el.Name.Local == "br" {
				inText = false
				buf.WriteString(" ")
			}
		case xml.CharData:
			if inText {
				buf.Write(el)
			}
		}
	}

	return strings.TrimSpace(buf.String()), nil
}
