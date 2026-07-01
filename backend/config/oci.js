const axios = require('axios');
const fs = require('fs');

const PAR_BASE = 'https://objectstorage.sa-saopaulo-1.oraclecloud.com/p/Qt5KR8hUN8RssfUcAIF2Ul_dxWYE_XtnU1DTLzu6c4Mh0XU0b4t6Aikk7kwhC_GW/n/grhztes5ppus/b/dbguard-backups/o';

// Upload de arquivo para OCI
async function uploadToOCI(filePath, objectName) {
  const fileContent = fs.readFileSync(filePath);
  const fileSizeMB  = fs.statSync(filePath).size / (1024 * 1024);

  await axios.put(`${PAR_BASE}/${objectName}`, fileContent, {
    headers: { 'Content-Type': 'application/octet-stream' },
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    timeout: 300000 // 5 minutos
  });

  return {
    path: `oci://dbguard-backups/${objectName}`,
    sizeMB: fileSizeMB
  };
}

// Deletar objeto
async function deleteObject(objectName) {
  try {
    await axios.delete(`${PAR_BASE}/${objectName}`);
    return true;
  } catch (err) {
    console.error(`Erro ao deletar ${objectName}:`, err.message);
    return false;
  }
}

// Gerar URL de download de um objeto
function getDownloadUrl(objectName) {
  return `${PAR_BASE}/${objectName}`;
}

module.exports = { uploadToOCI, deleteObject, getDownloadUrl };
