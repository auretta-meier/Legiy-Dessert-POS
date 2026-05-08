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
