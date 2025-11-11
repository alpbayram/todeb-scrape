import { Client, Databases, ID } from "node-appwrite";
import * as cheerio from "cheerio";

// Appwrite Function entry point
export default async ({ req, res, log, error }) => {
  try {
    // 1) Appwrite client'ı hazırla
    const client = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT)        // Örn: https://cloud.appwrite.io/v1
      .setProject(process.env.APPWRITE_PROJECT_ID)       // Proje ID
      .setKey(process.env.APPWRITE_API_KEY);             // API Key

    const databases = new Databases(client);

    // 2) Sayfayı çek
    const response = await fetch("https://gib.gov.tr/mevzuat/taslak");
    const html = await response.text();

    // 3) HTML'i cheerio ile parse et
    const $ = cheerio.load(html);

    // Selector: .css-18unqsv a:first-child .css-63gy1o span
    const text = $(".css-18unqsv a:first-child .css-63gy1o span")
      .first()
      .text()
      .trim();

    if (!text) {
      throw new Error("Selector ile herhangi bir metin bulunamadı.");
    }

    // 4) Appwrite Databases'e kaydet
    const doc = await databases.createDocument(
      process.env.APPWRITE_DATABASE_ID,
      process.env.APPWRITE_COLLECTION_ID,
      ID.unique(), // otomatik random ID
      {
        text,
        createdAt: new Date().toISOString()
      }
    );

    log(`Kaydedilen doküman ID: ${doc.$id}`);

    // 5) Fonksiyonun HTTP cevabı
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
