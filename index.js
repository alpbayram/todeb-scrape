import { Client, Databases, ID } from "node-appwrite";

export default async ({ req, res, log, error }) => {
  // DEBUG: Fonksiyon için Appwrite tarafından verilen key var mı?
  const hasFunctionKey = !!process.env.APPWRITE_FUNCTION_API_KEY;
  const endpoint = process.env.APPWRITE_FUNCTION_API_ENDPOINT;
  const projectId = process.env.APPWRITE_FUNCTION_PROJECT_ID;

  try {
    // 1) Appwrite client
    const client = new Client()
      .setEndpoint(endpoint)
      .setProject(projectId)
      .setKey(process.env.APPWRITE_FUNCTION_API_KEY); // 🔴 Dinamik function key

    const databases = new Databases(client);

    // 2) GİB API'ine POST isteği
    const response = await fetch(
      "https://gib.gov.tr/api/gibportal/mevzuat/taslak/list?page=0&size=10",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          deleted: false,
          status: 2
        })
      }
    );

    if (!response.ok) {
      throw new Error("API çağrısı başarısız. Status: " + response.status);
    }

    // 3) JSON'u çöz
    const data = await response.json();

    // 4) İlk kaydın title'ını al
    const title = data?.resultContainer?.content?.[0]?.title?.trim();

    if (!title) {
      throw new Error("JSON içinde title bulunamadı.");
    }

    // 5) Appwrite Database'e kaydet
    const DATABASE_ID = "6912d6b4003e2fe8c7aa";      // 👈 değiştir
    const COLLECTION_ID = "taslaklar";  // 👈 değiştir

    const doc = await databases.createDocument(
      DATABASE_ID,
      COLLECTION_ID,
      ID.unique(),
      {
        text: title,
        createdAt: new Date().toISOString()
      }
    );

    log(`Kaydedilen doküman ID: ${doc.$id}`);

    // Başarılı cevap + debug bilgisi
    return res.json({
      success: true,
      title,
      documentId: doc.$id,
      debug: {
        hasFunctionKey,
        endpoint,
        projectId
      }
    });
  } catch (e) {
    error(e);

    // Hata cevabı + debug bilgisi
    return res.json(
      {
        success: false,
        message: e.message || "Bilinmeyen hata",
        debug: {
          hasFunctionKey,
          endpoint,
          projectId
        }
      },
      500
    );
  }
};
