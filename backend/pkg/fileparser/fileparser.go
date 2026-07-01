package fileparser

import (
	"archive/zip"
	"bytes"
	"encoding/xml"
	"errors"
	"io"
	"strings"

	"github.com/ledongthuc/pdf"
)

// ErrImageBasedPDF is returned when a PDF contains only images and no extractable text.
var ErrImageBasedPDF = errors.New("无法识别该文件内容，请上传文字型 PDF")

// ErrEmptyContent is returned when the file contains no meaningful text.
var ErrEmptyContent = errors.New("文件内容为空，无法提取有效信息")

// ExtractPDFText takes raw PDF bytes and returns plain text.
// Returns ErrImageBasedPDF if the PDF appears to be image-based (no extractable text).
// Returns an error if the PDF data is malformed.
func ExtractPDFText(data []byte) (string, error) {
	text, err := parsePDF(data)
	if err != nil {
		return "", err
	}

	trimmed := strings.TrimSpace(text)
	if trimmed == "" {
		return "", ErrImageBasedPDF
	}

	return trimmed, nil
}

// ExtractDocxText takes raw DOCX bytes and returns plain text.
// Returns ErrEmptyContent if no text could be extracted.
func ExtractDocxText(data []byte) (string, error) {
	text, err := parseDOCX(data)
	if err != nil {
		return "", err
	}

	trimmed := strings.TrimSpace(text)
	if trimmed == "" {
		return "", ErrEmptyContent
	}

	return trimmed, nil
}

// ParseFile extracts text content from a file based on its extension.
// Supported formats: .txt, .md, .pdf, .docx
func ParseFile(filename string, data []byte) (string, error) {
	lower := strings.ToLower(filename)

	switch {
	case strings.HasSuffix(lower, ".txt"), strings.HasSuffix(lower, ".md"):
		return string(data), nil

	case strings.HasSuffix(lower, ".pdf"):
		return ExtractPDFText(data)

	case strings.HasSuffix(lower, ".docx"):
		return ExtractDocxText(data)

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
