import { Client } from '@notionhq/client';

export const notion = new Client({
    auth: process.env.NOTION_API_KEY || '',
});

/**
 * Funzione helper per creare rapidamente un Task nel database di Notion.
 * Usa uno schema standard: Titolo (Name), Data (Date), e Categoria (Select).
 */
export async function createNotionTask(title: string, date: string, category: string) {
    if (!process.env.NOTION_API_KEY || !process.env.NOTION_DATABASE_ID) {
        throw new Error("Missing Notion Environment Variables (NOTION_API_KEY or NOTION_DATABASE_ID)");
    }

    try {
        const response = await notion.pages.create({
            parent: {
                database_id: process.env.NOTION_DATABASE_ID,
            },
            properties: {
                // Assumiamo che il nome della colonna primaria sia "Name" (Titolo)
                "Name": {
                    title: [
                        { text: { content: title } }
                    ]
                },
                // Assumiamo una colonna Date chiamata "Date"
                "Date": {
                    date: { start: date } // Formato atteso: YYYY-MM-DD
                },
                // Assumiamo una colonna Select chiamata "Category" (es. Email, Progetto, Idea)
                "Category": {
                    select: { name: category }
                }
            }
        });

        return response;
    } catch (error) {
        console.error("[Notion Error] Fallimento nella creazione del task in Notion:", error);
        throw error;
    }
}
