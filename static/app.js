class VertigoLogger {
    constructor() {
        this.apiBase = '';
        this.recognition = null;
        this.isRecording = false;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupSpeechRecognition();
        this.loadEpisodes();
    }

    setupEventListeners() {
        document.getElementById('episode-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitEpisode();
        });

        document.getElementById('analyze-btn').addEventListener('click', () => {
            this.analyzeEpisode();
        });

        document.getElementById('voice-btn').addEventListener('click', () => {
            this.toggleVoiceRecording();
        });

        document.getElementById('export-csv').addEventListener('click', () => {
            this.exportData();
        });
    }

    setupSpeechRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.lang = 'en-US';

            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                const symptomsField = document.getElementById('symptoms');
                symptomsField.value += (symptomsField.value ? ' ' : '') + transcript;
                this.stopRecording();
            };

            this.recognition.onend = () => {
                this.stopRecording();
            };

            this.recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                this.showStatus('Voice recognition error: ' + event.error, 'error');
                this.stopRecording();
            };
        } else {
            console.warn('Speech recognition not supported');
            document.getElementById('voice-btn').style.display = 'none';
        }
    }

    toggleVoiceRecording() {
        if (!this.recognition) {
            this.showStatus('Voice recognition not supported', 'error');
            return;
        }

        if (this.isRecording) {
            this.recognition.stop();
        } else {
            this.startRecording();
        }
    }

    startRecording() {
        this.isRecording = true;
        const voiceBtn = document.getElementById('voice-btn');
        voiceBtn.classList.add('recording');
        voiceBtn.title = 'Stop Recording';

        try {
            this.recognition.start();
            this.showStatus('Listening...', 'info');
        } catch (error) {
            console.error('Failed to start recording:', error);
            this.stopRecording();
        }
    }

    stopRecording() {
        this.isRecording = false;
        const voiceBtn = document.getElementById('voice-btn');
        voiceBtn.classList.remove('recording');
        voiceBtn.title = 'Voice Input';

        if (this.recognition) {
            this.recognition.stop();
        }
    }

    async submitEpisode() {
        const formData = this.getFormData();

        if (!formData.severity) {
            this.showStatus('Please select a severity level', 'error');
            return;
        }

        try {
            const response = await fetch(`${this.apiBase}/api/episodes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                const episode = await response.json();
                this.showStatus('Episode logged successfully!', 'success');
                this.clearForm();
                this.loadEpisodes();
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            console.error('Error submitting episode:', error);
            this.showStatus('Failed to log episode', 'error');
        }
    }

    async analyzeEpisode() {
        const symptoms = document.getElementById('symptoms').value;
        const triggers = document.getElementById('triggers').value;
        const severity = parseInt(document.getElementById('severity').value);

        if (!symptoms) {
            this.showStatus('Please describe symptoms first', 'error');
            return;
        }

        const analysisRequest = {
            symptoms,
            triggers: triggers || null,
            severity: severity || null,
        };

        try {
            this.showStatus('Analyzing with AI...', 'info');

            const response = await fetch(`${this.apiBase}/api/analyze`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(analysisRequest),
            });

            if (response.ok) {
                const analysis = await response.json();
                this.displayAnalysis(analysis);
                this.showStatus('Analysis complete', 'success');
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            console.error('Error analyzing episode:', error);
            this.showStatus('Failed to analyze episode', 'error');
        }
    }

    displayAnalysis(analysis) {
        const analysisDiv = document.getElementById('ai-analysis');
        const contentDiv = document.getElementById('analysis-content');
        const recommendationsDiv = document.getElementById('recommendations');

        contentDiv.innerHTML = `<p><strong>Analysis:</strong> ${analysis.analysis}</p>`;

        if (analysis.recommendations && analysis.recommendations.length > 0) {
            recommendationsDiv.innerHTML = `
                <div class="recommendations">
                    <h4>Recommendations:</h4>
                    <ul>
                        ${analysis.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                    </ul>
                </div>
            `;
        }

        analysisDiv.style.display = 'block';
    }

    async loadEpisodes() {
        try {
            const response = await fetch(`${this.apiBase}/api/episodes`);
            if (response.ok) {
                const episodes = await response.json();
                this.displayEpisodes(episodes);
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            console.error('Error loading episodes:', error);
            document.getElementById('episodes-list').innerHTML =
                '<p>Failed to load episodes. Please check if the server is running.</p>';
        }
    }

    displayEpisodes(episodes) {
        const episodesList = document.getElementById('episodes-list');

        if (episodes.length === 0) {
            episodesList.innerHTML = '<p>No episodes logged yet.</p>';
            return;
        }

        const episodesHtml = episodes.map(episode => `
            <div class="episode-item">
                <div class="episode-header">
                    <div>
                        <strong>${new Date(episode.timestamp).toLocaleString()}</strong>
                        ${episode.duration_minutes ? `(${episode.duration_minutes} min)` : ''}
                    </div>
                    <span class="episode-severity severity-${episode.severity}">
                        Severity ${episode.severity}
                    </span>
                </div>
                <div class="episode-details">
                    ${episode.symptoms ? `<div class="episode-detail"><strong>Symptoms:</strong> ${episode.symptoms}</div>` : ''}
                    ${episode.triggers ? `<div class="episode-detail"><strong>Triggers:</strong> ${episode.triggers}</div>` : ''}
                    ${episode.location ? `<div class="episode-detail"><strong>Location:</strong> ${episode.location}</div>` : ''}
                    ${episode.activities_before ? `<div class="episode-detail"><strong>Activities:</strong> ${episode.activities_before}</div>` : ''}
                    ${episode.medications_taken ? `<div class="episode-detail"><strong>Medications:</strong> ${episode.medications_taken}</div>` : ''}
                    ${episode.notes ? `<div class="episode-detail"><strong>Notes:</strong> ${episode.notes}</div>` : ''}
                    ${episode.ai_analysis ? `<div class="episode-detail"><strong>AI Analysis:</strong> ${episode.ai_analysis}</div>` : ''}
                </div>
            </div>
        `).join('');

        episodesList.innerHTML = episodesHtml;
    }

    async exportData() {
        try {
            this.showStatus('Generating export...', 'info');

            const response = await fetch(`${this.apiBase}/api/export`);
            if (response.ok) {
                const csvData = await response.text();
                this.downloadCSV(csvData);
                this.showStatus('Data exported successfully!', 'success');
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            console.error('Error exporting data:', error);
            this.showStatus('Failed to export data', 'error');
        }
    }

    downloadCSV(csvData) {
        const blob = new Blob([csvData], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vertigo-episodes-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }

    getFormData() {
        return {
            severity: parseInt(document.getElementById('severity').value) || null,
            duration_minutes: parseInt(document.getElementById('duration').value) || null,
            symptoms: document.getElementById('symptoms').value || null,
            triggers: document.getElementById('triggers').value || null,
            location: document.getElementById('location').value || null,
            activities_before: document.getElementById('activities').value || null,
            medications_taken: document.getElementById('medications').value || null,
            notes: document.getElementById('notes').value || null,
        };
    }

    clearForm() {
        document.getElementById('episode-form').reset();
        document.getElementById('ai-analysis').style.display = 'none';
    }

    showStatus(message, type) {
        const statusDiv = document.getElementById('status');
        statusDiv.textContent = message;
        statusDiv.className = `status ${type}`;

        setTimeout(() => {
            statusDiv.className = 'status';
        }, 3000);
    }
}

function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    document.getElementById(`${tabName}-tab`).classList.add('active');
    event.target.classList.add('active');

    if (tabName === 'history') {
        app.loadEpisodes();
    }
}

const app = new VertigoLogger();