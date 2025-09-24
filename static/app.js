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
        this.charts = {};
        this.setupServiceWorker();
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

        document.getElementById('export-pdf').addEventListener('click', () => {
            this.exportPDFReport();
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

    async loadAnalytics() {
        try {
            const response = await fetch(`${this.apiBase}/api/analytics`);
            if (response.ok) {
                const analytics = await response.json();
                this.displayAnalytics(analytics);
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            console.error('Error loading analytics:', error);
            this.showStatus('Failed to load analytics', 'error');
        }
    }

    displayAnalytics(analytics) {
        // Update stat cards
        document.getElementById('total-episodes').textContent = analytics.total_episodes;
        document.getElementById('avg-severity').textContent = analytics.average_severity.toFixed(1);
        document.getElementById('avg-duration').textContent = analytics.duration_stats.average_minutes > 0
            ? `${analytics.duration_stats.average_minutes.toFixed(0)} min`
            : '- min';

        // Most common trigger
        const commonTrigger = analytics.trigger_frequency.length > 0
            ? analytics.trigger_frequency.sort((a, b) => b.count - a.count)[0].trigger
            : 'None';
        document.getElementById('common-trigger').textContent = commonTrigger;

        // Duration stats
        document.getElementById('min-duration').textContent = `${analytics.duration_stats.min_minutes} min`;
        document.getElementById('max-duration').textContent = `${analytics.duration_stats.max_minutes} min`;
        document.getElementById('median-duration').textContent = `${analytics.duration_stats.median_minutes} min`;

        // Create charts
        this.createSeverityChart(analytics.severity_distribution);
        this.createTrendsChart(analytics.monthly_trends);
        this.createTriggersChart(analytics.trigger_frequency);
    }

    createSeverityChart(severityData) {
        const ctx = document.getElementById('severity-chart').getContext('2d');

        if (this.charts.severity) {
            this.charts.severity.destroy();
        }

        const labels = severityData.map(item => `Severity ${item.severity}`);
        const data = severityData.map(item => item.count);
        const colors = ['#28a745', '#ffc107', '#fd7e14', '#dc3545', '#6f42c1'];

        this.charts.severity = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors.slice(0, data.length),
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    createTrendsChart(trendsData) {
        const ctx = document.getElementById('trends-chart').getContext('2d');

        if (this.charts.trends) {
            this.charts.trends.destroy();
        }

        const labels = trendsData.map(item => item.month);
        const episodeCounts = trendsData.map(item => item.episode_count);
        const avgSeverities = trendsData.map(item => item.average_severity);

        this.charts.trends = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Episode Count',
                    data: episodeCounts,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    yAxisID: 'y',
                    tension: 0.4
                }, {
                    label: 'Avg Severity',
                    data: avgSeverities,
                    borderColor: '#764ba2',
                    backgroundColor: 'rgba(118, 75, 162, 0.1)',
                    yAxisID: 'y1',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Episode Count'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Average Severity'
                        },
                        grid: {
                            drawOnChartArea: false,
                        },
                    }
                }
            }
        });
    }

    createTriggersChart(triggersData) {
        const ctx = document.getElementById('triggers-chart').getContext('2d');

        if (this.charts.triggers) {
            this.charts.triggers.destroy();
        }

        if (triggersData.length === 0) {
            ctx.font = '16px Arial';
            ctx.fillStyle = '#666';
            ctx.textAlign = 'center';
            ctx.fillText('No trigger data available', ctx.canvas.width / 2, ctx.canvas.height / 2);
            return;
        }

        // Take top 5 triggers
        const topTriggers = triggersData.sort((a, b) => b.count - a.count).slice(0, 5);
        const labels = topTriggers.map(item => item.trigger);
        const data = topTriggers.map(item => item.count);

        this.charts.triggers = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Frequency',
                    data: data,
                    backgroundColor: 'rgba(102, 126, 234, 0.7)',
                    borderColor: '#667eea',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    async exportPDFReport() {
        try {
            this.showStatus('Generating medical report...', 'info');

            const response = await fetch(`${this.apiBase}/api/report/pdf`);
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `vertigo-medical-report-${new Date().toISOString().split('T')[0]}.pdf`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                this.showStatus('Medical report downloaded successfully!', 'success');
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            console.error('Error generating PDF report:', error);
            this.showStatus('Failed to generate PDF report', 'error');
        }
    }

    setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then((registration) => {
                    console.log('Service Worker registered successfully:', registration.scope);
                })
                .catch((error) => {
                    console.log('Service Worker registration failed:', error);
                });
        }
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
    } else if (tabName === 'analytics') {
        app.loadAnalytics();
    }
}

const app = new VertigoLogger();