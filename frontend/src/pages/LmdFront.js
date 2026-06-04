import React, { useState } from 'react';
import axios from 'axios';

const LettreMiseEndemeurword = () => {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleFileChange = (event) => {
        setFile(event.target.files[0]);
    };

    const handleUpload = async () => {
        if (!file) {
            alert("Please select a file first.");
            return;
        }

        const formData = new FormData();
        formData.append("file", file);

        setLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem('mizan_token');

            const response = await axios.post(
                'http://localhost:4000/api/upload-excel',
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        'Authorization': `Bearer ${token}`,
                    },
                    responseType: 'blob',
                }
            );

            const blob = new Blob([response.data], {
                type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            });

            const baseName = file.name.split('.').slice(0, -1).join('.');
            const wordFileName = `${baseName}.docx`;

            const downloadLink = document.createElement('a');
            downloadLink.href = URL.createObjectURL(blob);
            downloadLink.download = wordFileName;
            downloadLink.click();

        } catch (err) {
            if (err.response?.status === 401) {
                setError('Session expirée. Veuillez vous reconnecter.');
            } else {
                setError('Erreur lors du téléchargement. Veuillez réessayer.');
            }
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <h2 style={styles.heading}>LMD fichier Word</h2>
                <p style={styles.description}>Uploader un fichier avec extension .xlsx ou .xls</p>
                <div style={styles.inputGroup}>
                    <input
                        type="file"
                        accept=".xlsx, .xls"
                        onChange={handleFileChange}
                        style={styles.fileInput}
                    />
                </div>
                <button
                    onClick={handleUpload}
                    style={{...styles.uploadBtn, ...(loading ? styles.loadingBtn : {})}}
                    disabled={loading}
                >
                    {loading ? 'Téléchargement...' : 'Télécharger'}
                </button>
                {error && <p style={styles.error}>{error}</p>}
            </div>
        </div>
    );
};

const styles = {
    container: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#f4f4f9',
        margin: 0,
    },
    card: {
        padding: '20px',
        width: '100%',
        maxWidth: '500px',
        backgroundColor: '#fff',
        borderRadius: '8px',
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
        textAlign: 'center',
    },
    heading: {
        fontSize: '24px',
        color: '#333',
        marginBottom: '10px',
    },
    description: {
        fontSize: '16px',
        color: '#555',
        marginBottom: '20px',
    },
    inputGroup: {
        marginBottom: '20px',
    },
    fileInput: {
        width: '100%',
        padding: '10px',
        fontSize: '16px',
        border: '1px solid #ccc',
        borderRadius: '4px',
        backgroundColor: '#f9f9f9',
        cursor: 'pointer',
    },
    uploadBtn: {
        width: '100%',
        padding: '12px',
        backgroundColor: '#4CAF50',
        color: '#fff',
        border: 'none',
        fontSize: '18px',
        borderRadius: '4px',
        cursor: 'pointer',
        transition: 'background-color 0.3s',
    },
    loadingBtn: {
        backgroundColor: '#ffc107',
    },
    error: {
        color: 'red',
        marginTop: '20px',
        fontSize: '14px',
    },
};

export default LettreMiseEndemeurword;