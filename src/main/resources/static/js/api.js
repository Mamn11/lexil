async function translateText(text) {
    const endpoint = '/api/translate';
  
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text: text })
        });
  
        if (!response.ok) {
            throw new Error('Falha na comunicação com o servidor Java.');
        }
  
        const data = await response.json();
        return data.translatedText; 
  
    } catch (error) {
        console.error("Erro na tradução:", error);
        throw error;
    }
}