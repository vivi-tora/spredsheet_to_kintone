import { useState } from 'react';
import { ExecuteButton, LoadingIndicator, ResultsTable } from './UI';

export default function MainApp() {
  const [isLoading, setIsLoading] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<string | null>(null);
  const [results, setResults] = useState<any[] | null>(null);

  const handleExecute = async () => {
    setIsLoading(true);
    setResults(null);

    try {
      // Fetch data from spreadsheet
      setCurrentPhase('スプレッドシートから情報を取得中です...');
      const spreadsheetData = await fetchSpreadsheetData();
      // console.log('スプシデータ');
      // console.log(JSON.stringify(spreadsheetData, null, 2));


      // Scrape data
      setCurrentPhase('JANコードをもとに情報を取得中です...');
      const scrapedData = await scrapeData(spreadsheetData);
      // console.log('スクレイピングデータ');
      // console.log(JSON.stringify(scrapedData, null, 2));

      // Add to Kintone
      setCurrentPhase('kintoneに情報を追加中です...');
      const kintoneResults = await addToKintone(scrapedData);
      setResults(kintoneResults);
    } catch (error) {
      console.error('Error during execution:', error);
      alert('エラーが発生しました。詳細はコンソールを確認してください。');
    } finally {
      setIsLoading(false);
      setCurrentPhase(null);
    }
  };

  return (
    <div>
      <ExecuteButton onClick={handleExecute} disabled={isLoading} />
      {isLoading && <LoadingIndicator message={currentPhase} />}
      {results && <ResultsTable data={results} />}
    </div>
  );
}

async function fetchSpreadsheetData() {
  const response = await fetch('/api/fetchSpreadsheetData');
  if (!response.ok) throw new Error('Failed to fetch spreadsheet data');
  return response.json();
}

async function scrapeData(spreadsheetData: any[]) {
  const response = await fetch('/api/scrapeData', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(spreadsheetData),
  });
  if (!response.ok) throw new Error(`Failed to scrape data`);
  return response.json();
}

async function addToKintone(scrapedData: any[]) {
  const response = await fetch('/api/addToKintone', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(scrapedData),
  });
  if (!response.ok) throw new Error('Failed to add data to Kintone');
  return response.json();
}
