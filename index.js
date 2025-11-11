const sdk = require("node-appwrite");
const cheerio = require("cheerio");

module.exports = async function (req, res) {
    try {
        // 1. Kullanıcıdan gelen veriyi al
        const payload = req.payload ? JSON.parse(req.payload) : {};
        const url = payload.url;

        if (!url) {
            res.json({ error: "URL gerekli" }, 400);
            return;
        }

        // 2. Appwrite istemcisini hazırla
        const client = new sdk.Client();
        client
            .setEndpoint(process.env.APPWRITE_FUNCTION_ENDPOINT)
            .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
            .setKey(process.env.APPWRITE_FUNCTION_API_KEY);

        const databases = new sdk.Databases(client);

        const databaseId = "scraper"; // senin database ID
        const collectionId = "page_text"; // senin collection ID

        // 3. HTML indir
        const response = await fetch(url);
        const html = await response.text();

        // 4. HTML'i cheerio ile yükle
        const $ = cheerio.load(html);

        // 5. Selector ile elementi bul
        const selector = ".css-18unqsv a:first-child .css-63gy1o span";
        const selectedElement = $(selector);

        // 6. Elementin içindeki yazıyı al
        const textValue = selectedElement.text().trim();

        // 7. Eğer hiçbir şey bulamadıysak hata ver
        if (!textValue) {
            res.json({ error: "Verilen selector ile text bulunamadı." }, 404);
            return;
        }

        // 8. Veriyi database'e kaydet
        const result = await databases.createDocument(
            databaseId,
            collectionId,
            "unique()", // otomatik ID oluştur
            {
                url: url,
                selector: selector,
                text: textValue,
                createdAt: new Date().toISOString(),
            }
        );

        // 9. Başarılı sonucu döndür
        res.json({
            message: "Veri başarıyla kaydedildi.",
            data: {
                url: url,
                selector: selector,
                text: textValue,
            },
        });
    } catch (error) {
        res.json({ error: error.message }, 500);
    }
};
