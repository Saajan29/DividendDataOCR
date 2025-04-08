// ==UserScript==
// @name         DividendData OCR with Button + pence support
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  Convert dividend images to accurate text on dividenddata.co.uk (includes pence support and better decimal handling), then adds a CSV export button after OCR finishes. Uses Tesseract.js with preprocessing for improved results.
// @author       You
// @match        https://www.dividenddata.co.uk/*
// @grant        none
// @require      https://unpkg.com/tesseract.js@5.0.4/dist/tesseract.min.js
// ==/UserScript==

(function () {
    'use strict';

    let ocrResults = [];

    // 1. Preprocess image for clearer OCR
    function preprocessImage(img) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const scale = 2;

            canvas.width = img.naturalWidth * scale;
            canvas.height = img.naturalHeight * scale;
            ctx.scale(scale, scale);
            ctx.drawImage(img, 0, 0);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            for (let i = 0; i < data.length; i += 4) {
                const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                const threshold = avg > 140 ? 255 : 0;
                data[i] = data[i + 1] = data[i + 2] = threshold;
            }

            ctx.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL());
        });
    }

    // 2. Clean and correct OCR output
    function cleanExtractedText(text) {
        let cleaned = text
            .replace(/[|]/g, '1')
            .replace(/[,]/g, '.')
            .replace(/[^0-9£$€p.]/gi, '')
            .replace(/\.{2,}/g, '.')
            .trim();

        // Fix 3-digit numbers like "143" → "1.43"
        if (/^\d{3}$/.test(cleaned)) {
            cleaned = cleaned.replace(/^(\d)(\d{2})$/, '$1.$2');
        }

        // Strip trailing dot
        if (/^\d+\.$/.test(cleaned)) {
            cleaned = cleaned.replace(/\.$/, '');
        }

        return cleaned;
    }

    // 3. Generate and download CSV file
    function downloadCSV() {
        const csvRows = [['Row', 'Column', 'Extracted Text']];
        ocrResults.forEach(item => {
            csvRows.push([item.row, item.col, item.text]);
        });

        const csvContent = csvRows.map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'dividend-data-ocr.csv';
        a.click();
    }

    // 4. Add the button to top of page
    function addDownloadButton() {
        const btn = document.createElement('button');
        btn.textContent = '⬇ Download OCR CSV';
        btn.style.position = 'fixed';
        btn.style.top = '10px';
        btn.style.right = '10px';
        btn.style.zIndex = '9999';
        btn.style.padding = '10px 16px';
        btn.style.backgroundColor = '#007bff';
        btn.style.color = 'white';
        btn.style.border = 'none';
        btn.style.borderRadius = '8px';
        btn.style.fontSize = '14px';
        btn.style.cursor = 'pointer';
        btn.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';

        btn.addEventListener('click', downloadCSV);
        document.body.appendChild(btn);
    }

    // 5. Run OCR across all images
    async function convertImagesToText() {
        const images = document.querySelectorAll('table img');
        let index = 0;

        for (const img of images) {
            const td = img.closest('td');
            const tr = img.closest('tr');
            const row = tr ? Array.from(tr.parentElement.children).indexOf(tr) + 1 : index + 1;
            const col = td && tr ? Array.from(tr.children).indexOf(td) + 1 : '?';

            const processedSrc = await preprocessImage(img);

            try {
                const result = await Tesseract.recognize(
                    processedSrc,
                    'eng',
                    {
                        tessedit_char_whitelist: '0123456789.£$€p',
                        logger: m => console.log(`[OCR] ${m.status}: ${Math.round(m.progress * 100)}%`)
                    }
                );

                const raw = result.data.text.trim();
                const cleaned = cleanExtractedText(raw);

                ocrResults.push({ row, col, text: cleaned || '[?]' });

                const span = document.createElement('span');
                span.textContent = cleaned || '[?]';
                span.style.fontWeight = 'bold';
                span.style.color = 'green';

                img.replaceWith(span);

            } catch (err) {
                console.error('[OCR Error]', err);
            }

            index++;
        }

        // Show download button once OCR is done
        addDownloadButton();
    }

    // 6. Start OCR once page is loaded
    window.addEventListener('load', () => {
        convertImagesToText();
    });

})();
