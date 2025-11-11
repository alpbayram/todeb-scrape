const sdk = require("node-appwrite");
const cheerio = require("cheerio");

module.exports = async function (context) {
  // context içinden ihtiyacımız olanları tek tek alıyoruz
  const req = context.req;
  const res = context.res;
  const log = context.log;
  const errorLog = context.error;

  try {
    // 1. Gönderilen body'yi JSON olarak al
    // Appwrite yeni nesil dokümana göre body için bodyJson kullanılmalı
    // (Console'da JSON yazdığında buradan okunuyor)
    const body = req.bodyJson;

    let url = null;
    if (body && body.url) {
      url = body.url;
    }

    if (!url) {
      return res.json(
        {
          error: "URL gerekli. Örneğin body içine { \"url\": \"https://ornek.com\" } gönder."
        },
        400
      );
    }

    // 2. Appwrite client'ını hazırla
    const client = new sdk.Client();

    client
      // API endpoint env değişkeni: APPWRITE_FUNCTION_API_ENDPOINT
      .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
      .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
      .setKey(process.env.APPWRITE_FUNCTION_API_KEY);

    const databases = new sdk.Databases(client);

    const databaseId = "scraper";      // kendi database ID'ini buraya yaz
    const collectionId = "page_texts"; // kendi collection ID'ini buraya yaz

    // 3. HTML'i indir
    const response = await fetch(url);
    const html = await response.text();

    // 4. HTML'i cheerio ile parse et
    const $ = cheerio.load(html);

    // 5. İlgili selector ile elementi bul
    const selector = ".css-18unqsv a:first-child .css-63gy1o span";
    const selectedElement = $(selector);

    // 6. Elementin içindeki text değerini al
    const textValue = selectedElement.text().trim();

    if (!textValue) {
      return res.json(
        {
          error: "Verilen selector ile text bulunamadı.",
          url: url,
          selector: selector
        },
        404
      );
    }

    // 7. Veritabanına kaydet
    const createdAt = new Date().toISOString();

    const result = await databases.createDocument(
      databaseId,
      collectionId,
      "unique()",
      {
        url: url,
        selector: selector,
        text: textValue,
        createdAt: createdAt
      }
    );

    // 8. Başarılı sonucu geri döndür
    return res.json(
      {
        message: "Veri başarıyla kaydedildi.",
        data: {
          url: url,
          selector: selector,
          text: textValue,
          createdAt: createdAt,
          documentId: result.$id
        }
      },
      200
    );
  } catch (error) {
    // Hata logla
    errorLog(error);

    // Hata cevabını geri döndür
    return res.json(
      {
        error: error.message || "Bilinmeyen bir hata oluştu."
      },
      500
    );
  }
};
