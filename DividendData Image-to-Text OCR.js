// ==UserScript==
// @name         DividendData Image-to-Text OCR
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Converts dividend value images into readable text on dividenddata.co.uk
// @author       You
// @match        https://www.dividenddata.co.uk/*
// @grant        none
// @require      https://unpkg.com/tesseract.js@5.0.4/dist/tesseract.min.js
// ==/UserScript==

(function () {
    'use strict';

    async function convertImagesToText() {
        const images = document.querySelectorAll('table img');

        for (const img of images) {
            const imageUrl = img.src;

            try {
                const result = await Tesseract.recognize(
                    imageUrl,
                    'eng',
                    {
                        logger: m => console.log(`[OCR] ${m.status}: ${Math.round(m.progress * 100)}%`)
                    }
                );

                const extractedText = result.data.text.trim();

                const span = document.createElement('span');
                span.textContent = extractedText;
                span.style.fontWeight = 'bold';

                img.replaceWith(span);

            } catch (err) {
                console.error('[OCR Error]', err);
            }
        }
    }

    // Run after the page fully loads
    window.addEventListener('load', () => {
        convertImagesToText();
    });

})();
