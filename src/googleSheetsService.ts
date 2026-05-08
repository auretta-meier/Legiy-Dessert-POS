export const syncToGoogleSheets = async (type: string, data: any) => {
  // In a real application, replace this URL with your Google Apps Script Web App URL
  const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxkjzZ4qKRd83IFr3qK_rv3r5UlxQKjGUWe3SX-kSKzxwicv8G_mDxj_vQxufynKWSo/exec'; 

  console.log(`Sending ${type} to Google Sheets:`, data);
  
  let action = "UPSERT";
  let targetSheet = type;
  
  if (type.startsWith("DELETE_")) {
    action = "DELETE";
    targetSheet = type.replace("DELETE_", "");
  }

  try {
    const payload = {
      type: targetSheet,
      action,
      data
    };

    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors', // Important to avoid CORS issues
      headers: {
        'Content-Type': 'text/plain', // Using text/plain handles no-cors simply
      },
      body: JSON.stringify(payload)
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error syncing to Google Sheets', error);
    return { success: false };
  }
}

export const fetchFromGoogleSheets = async () => {
  const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxkjzZ4qKRd83IFr3qK_rv3r5UlxQKjGUWe3SX-kSKzxwicv8G_mDxj_vQxufynKWSo/exec'; 

  try {
    const response = await fetch(SCRIPT_URL, {
      method: 'GET',
      redirect: 'follow', // Required to handle Google Apps Script 302 redirects
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const result = await response.json();
    return result;
  } catch (error) {
    // Only log the error if we really need to, otherwise silently fail to avoid console spam 
    // when adblockers or browser privacy settings block google apps script
    console.warn('Sync warning: Could not fetch from Google Sheets (might be blocked by browser/adblocker). Relying on local storage.');
    return null;
  }
}
