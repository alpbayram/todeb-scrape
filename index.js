import { Client, Databases, ID } from "node-appwrite";
import * as cheerio from "cheerio";

export default async ({ req, res, log, error }) => {
  try {
    // 1) Appwrite client'ı hazırla
    const client = new Client()
      .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)  // Otomatik gelen endpoint
      .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)     // Otomatik gelen project id
      .setKey(process.env.APPWRITE_FUNCTION_API_KEY);           // Dynamic API key

    const databases = new Databases(client);

    // 2) Sayfayı çek
    const response = await fetch("https://gib.gov.tr/mevzuat/taslak");
    const html = await response.text();

    // 3) HTML'i cheerio ile parse et
    const $ = cheerio.load(html);

    // İstediğin selector
    const text = $(".css-18unqsv a:first-child .css-63gy1o span")
      .first()
      .text()
      .trim();

    if (!text) {
      throw new Error("Selector ile herhangi bir metin bulunamadı.");
    }

    // 4) Database/collection id'lerini buraya sabit yaz
    const DATABASE_ID = "BURAYA_SENİN_DATABASE_ID";
    const COLLECTION_ID = "BURAYA_SENİN_COLLECTION_ID";

    const doc = await databases.createDocument(
      DATABASE_ID,
      COLLECTION_ID,
      ID.unique(),
      {
        text,
        createdAt: new Date().toISOString()
      }
    );

    log(`Kaydedilen doküman ID: ${doc.$id}`);

    // 5) Çağırana basit bir JSON dön
    return res.json({
      success: true,
      text,
      documentId: doc.$id
    });
  } catch (e) {
    error(e);
    return res.json(
      {
        success: false,
        message: e.message || "Bilinmeyen bir hata oluştu"
      },
      500
    );
  }
};
