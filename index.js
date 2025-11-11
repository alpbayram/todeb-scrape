import { Client, Databases, ID, Query } from "node-appwrite";

export default async ({ req, res, log, error }) => {
  try {
    // 1) Appwrite client
    const client = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT)
      .setProject(process.env.APPWRITE_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);

    const DATABASE_ID = process.env.DATABASE_ID;
    const COLLECTION_ID = process.env.COLLECTION_ID;

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

    const data = await response.json();

    // 3) Yeni title
    const newTitle = data?.resultContainer?.content?.[0]?.title?.trim();

    if (!newTitle) {
      throw new Error("JSON içinde title bulunamadı.");
    }

    // 4) DB'deki SON kaydı çek (en son oluşturulan doküman)
    const lastDocs = await databases.listDocuments(
      DATABASE_ID,
      COLLECTION_ID,
      [
        Query.orderDesc("$createdAt"),
        Query.limit(1)
      ]
    );

    let lastTitle = null;

    if (lastDocs.total > 0) {
      lastTitle = lastDocs.documents[0].text;
    }

    // 5) Değişmemişse hiçbir şey yapma
    if (lastTitle === newTitle) {
      log("Başlık değişmemiş, hiçbir işlem yapılmadı.");
      return res.json({
        success: true,
        changed: false,
        message: "Başlık aynı, DB ve mail tarafında işlem yapmadım.",
        currentTitle: newTitle
      });
    }

    // 6) Değişmişse: yeni doküman kaydet
    const doc = await databases.createDocument(
      DATABASE_ID,
      COLLECTION_ID,
      ID.unique(),
      {
        text: newTitle        
      }
    );

    log(`Yeni başlık kaydedildi. Doküman ID: ${doc.$id}`);

    // 7) BURADA mail fonksiyonunu tetikleyebilirsin
    // Örnek (şimdilik yorum satırı):
  
    await fetch("6909b832001efa359c90.fra.appwrite.run", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({        
       newChanges: newTitle,
       oldState: lastTitle,
        to:"alp.bayram@todeb.org.tr",
        subject: "Distill.io Güncelleme Raporu"
      })
    });
   
    return res.json({
      success: true,
      changed: true,
      message: "Başlık değişmiş, yeni kayıt DB'ye yazıldı ve burada mail tetiklenebilir.",
      newTitle,
      previousTitle: lastTitle,
      documentId: doc.$id
    });
  } catch (e) {
    error(e);
    return res.json(
      {
        success: false,
        message: e.message || "Bilinmeyen hata"
      },
      500
    );
  }
};
