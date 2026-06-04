const xlsx = require('xlsx');
const { Document, Packer, Paragraph, TextRun } = require('docx'); // ← Style supprimé
const fs = require('fs');
const path = require('path');

const splitAddress = (address, maxLength) => {
    const lines = [];
    let currentLine = '';
    const words = address.split(' ');

    words.forEach(word => {
        if (currentLine.length + word.length + 1 > maxLength) {
            if (currentLine.length > 0) lines.push(currentLine);
            currentLine = word;
        } else {
            if (currentLine.length > 0) currentLine += ' ';
            currentLine += word;
        }
    });

    if (currentLine.length > 0) lines.push(currentLine);
    return lines;
};

const uploadExcel = (req, res) => {
    if (!req.file) {
        return res.status(400).send('Aucun fichier téléchargé.');
    }

    try {
        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        // Taille de police commune
        const S = 24;
        const SL = 30;
        const SS = 20;

        const paragraphs = data.flatMap(item => {
            const addressLines = splitAddress(item.adresse || '', 35);

            const dateParagraph = new Paragraph({
                alignment: "left",
                children: [
                    new TextRun({
                        text: `${item.date_envoi} الدار البيضاء في `,
                        bold: true,
                        size: 26,
                    }),
                ],
                spacing: { before: 100, after: 100 },
            });

            const caseParagraph = new Paragraph({
                alignment: "center",
                children: [
                    new TextRun({
                        text: "رسالة الإنذار بالأداء مع الإشعار بالتوصل",
                        bold: true,
                        size: S,
                    }),
                ],
                spacing: { before: 300, after: 300 },
                bidirectional: true,
            });

            const combinedParagraph = new Paragraph({
                alignment: "left",
                children: [
                    new TextRun({
                        text: `${item.nom}`,
                        bold: true,
                        size: S,
                    }),
                    new TextRun({
                        text: " قضية ضد السيد(ة):                                   ",
                        bold: true,
                        size: S,
                        rightToLeft: true,
                    }),
                ],
                spacing: { before: 100, after: 100 },
            });

            const Rib = new Paragraph({
                alignment: "left",
                children: [
                    new TextRun({ text: `Rib:${item.Rib}`, bold: true, size: S }),
                ],
                spacing: { before: 100, after: 100 },
            });

            const ToDebiteur = new Paragraph({
                alignment: "center",
                children: [
                    new TextRun({
                        text: "إلـــــــــــى السيد(ة):",
                        bold: true,
                        size: S,
                        rightToLeft: true,
                    }),
                ],
                spacing: { before: 100, after: 100 },
            });

            const NomDeb = new Paragraph({
                alignment: "left",
                children: [
                    new TextRun({ text: `${item.nom}`, bold: true, size: S }),
                ],
                spacing: { before: 100, after: 100 },
            });

            const AdresseBloc = new Paragraph({
                alignment: "left",
                children: addressLines.flatMap(line => [
                    new TextRun({ text: line, bold: true, size: S }),
                    new TextRun({ text: "\n", size: 1 }),
                ]),
                spacing: { before: 400, after: 400 },
            });

            const Salutation = new Paragraph({
                alignment: "right",
                children: [
                    new TextRun({
                        text: "تــحية طـيبــــــة،",
                        bold: true,
                        size: S,
                        rightToLeft: true,
                    }),
                ],
                spacing: { before: 100, after: 100 },
            });

            const clientParagraph = new Paragraph({
                alignment: "right",
                children: [
                    new TextRun({ text: "لقد سلمني موكلي بنك أفريقيا ", size: SL }),
                    new TextRun({ text: "BANK OF AFRICA ,", bold: true, size: SL }),
                    new TextRun({ text: "  المدعو  سابقا البنك المغربي للتجارة ", size: SL }),
                ],
                spacing: { before: 100, after: 100 },
                bidirectional: true,
            });

            const clientParagraph2 = new Paragraph({
                alignment: "right",
                children: [
                    new TextRun({
                        text: `   ${item.creance}  الخارجية، ملفا ً يستفاد منه أنكم مدينون له، ما عدا خطأ أو سهو، بمبلغ يصل إلى`,
                        size: SL,
                    }),
                ],
                spacing: { before: 100, after: 100 },
                bidirectional: true,
            });

            const clientCreance = new Paragraph({
                alignment: "right",
                children: [
                    new TextRun({
                        text: ".درهم ناتج عن عدم تسديد مديونيتكم اتجاه البنك",
                        size: SL,
                    }),
                ],
                spacing: { before: 100, after: 100 },
                bidirectional: true,
            });

            const clientPenition = new Paragraph({
                alignment: "right",
                children: [
                    new TextRun({
                        text: "وبما أن جميع المحاولات الحبية لم تسفر عن أية نتيجة إيجابية، لذا فإنني أشعركم وعند الاقتضاء أندركم بضرورة تنفيذ التزاماتكم وذلك بأداء المبلغ المذكور أعلاه، داخل أجل أقصاه ثمانية أيام من تاريخ توصلكم بهذا الإنذار",
                        size: SL,
                    }),
                ],
                spacing: { before: 100, after: 100 },
                bidirectional: true,
            });

            const clientPenition2 = new Paragraph({
                alignment: "right",
                children: [
                    new TextRun({
                        text: "وفي حالة امتناعكم، فإني تلقيت من البنك كافة التعليمات لإقامة دعوى قضائية في مواجهتكم لإجباركم على الوفاء، بما في ذلك جميع الإجراءات التحفظية والحجوز، لضمان أداء دين موكلي مما سيضطركم إلى تحمل جميع المصاريف القضائية التابعة",
                        size: SL,
                    }),
                ],
                spacing: { before: 100, after: 100 },
                bidirectional: true,
            });

            const clientPenition3 = new Paragraph({
                alignment: "right",
                children: [
                    new TextRun({ text: "تقبلوا سيدتي، سيدي، فائق الاحترام", size: SL }),
                ],
                spacing: { before: 100, after: 100 },
                bidirectional: true,
            });

            const clientPenition4 = new Paragraph({
                alignment: "right",
                children: [
                    new TextRun({
                        text: "ملاحظة لتسوية وضعيتكم يمكنكم تحويل  المبلغ المشار إليه أعلاه على الحساب رقم ",
                        size: SL,
                    }),
                ],
                spacing: { before: 100, after: 100 },
                bidirectional: true,
            });

            const RibC = new Paragraph({
                alignment: "right",
                children: [
                    new TextRun({ text: `${item.RibC}`, size: SL }),
                ],
                spacing: { before: 100, after: 100 },
                bidirectional: true,
            });

            const RibCval = new Paragraph({
                alignment: "right",
                children: [
                    new TextRun({
                        text: " وإرسال وصل الأداء إلى المكلف بالتحصيل لملفكم لدى البنك أو ربط الاتصال به مباشرة على الرقم ",
                        size: SL,
                    }),
                ],
                spacing: { before: 100, after: 100 },
                bidirectional: true,
            });

            const inofrmationGestionnaire = new Paragraph({
                alignment: "left",
                children: [
                    new TextRun({ text: `M/Mme : ${item.gestionnaire}`, size: SS, font: "Arial" }),
                ],
                spacing: { before: 100, after: 100 },
            });

            const inofrmationGestionnaireGsm = new Paragraph({
                alignment: "left",
                children: [
                    new TextRun({ text: `GSM n°: ${item.tell}`, size: SS, font: "Arial" }),
                ],
                spacing: { before: 100, after: 100 },
            });

            const inofrmationGestionnaireFixe = new Paragraph({
                alignment: "left",
                children: [
                    new TextRun({ text: `Fixe n°: ${item.fixe}`, size: SS, font: "Arial" }),
                ],
                spacing: { before: 100, after: 100 },
            });

            const inofrmationGestionnaireAdresse = new Paragraph({
                alignment: "left",
                children: [
                    new TextRun({
                        text: "Adresse : RM Expert -BMCE GROUPE- Zenith Millennium, Immeuble 3 et 4, 2ème étage, Sidi Maârouf. Casablanca",
                        size: SS,
                        font: "Arial",
                    }),
                ],
                spacing: { before: 100, after: 100 },
            });

            const pageBreak = new Paragraph({
                children: [],
                pageBreakBefore: true,
            });

            return [
                dateParagraph,
                caseParagraph,
                combinedParagraph,
                Rib,
                ToDebiteur,
                NomDeb,
                AdresseBloc,
                Salutation,
                clientParagraph,
                clientParagraph2,
                clientCreance,
                clientPenition,
                clientPenition2,
                clientPenition3,
                clientPenition4,
                RibC,
                RibCval,
                inofrmationGestionnaire,
                inofrmationGestionnaireGsm,
                inofrmationGestionnaireFixe,
                inofrmationGestionnaireAdresse,
                pageBreak,
            ];
        });

        const doc = new Document({
            sections: [{
                properties: {},
                children: paragraphs,
            }],
        });

        const filePath = path.join(__dirname, '../uploads/Lmd_avocat.docx');
        fs.mkdirSync(path.dirname(filePath), { recursive: true });

        Packer.toBuffer(doc).then(buffer => {
            fs.writeFileSync(filePath, buffer);
            res.download(filePath, 'lmd_avocat.docx', err => {
                if (err) {
                    console.error(err);
                    res.status(500).send('Erreur lors du téléchargement du fichier.');
                }
                fs.unlinkSync(filePath);
            });
        }).catch(error => {
            console.error('Packer error:', error);
            res.status(500).send('Erreur lors de la génération du document Word.');
        });

    } catch (error) {
        console.error('Controller error:', error);
        res.status(500).send('Erreur serveur: ' + error.message);
    }
};

module.exports = { uploadExcel };