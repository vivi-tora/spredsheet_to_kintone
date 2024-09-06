import React, { useState } from "react";
import {
  ExecuteButton,
  LoadingIndicator,
  ResultsTable,
} from "./UI";
import { ProgressBar } from "./ui/ProgressBar";
import { processScrapedData } from "@/utils/processScrapedData";

export default function MainApp() {
  const [isLoading, setIsLoading] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<string | null>(null);
  const [results, setResults] = useState<any[] | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleExecute = async () => {
    setIsLoading(true);
    setResults(null);
    setError(null);
    setProgress(0);

    try {
      // Fetch data from spreadsheet
      setCurrentPhase("スプレッドシートから情報を取得中です...");
      const { batches, totalItems, totalBatches } =
        await fetchSpreadsheetData();
      console.log("スプシデータ");
      console.log(JSON.stringify({ totalItems, totalBatches }, null, 2));

      let allScrapedData: any[] = [];
      let allProcessedData: any[] = [];
      let allKintoneResults: any[] = [];

      for (let i = 0; i < batches.length; i++) {
        // Scrape data
        setCurrentPhase(
          `JANコードをもとに情報を取得中です... (バッチ ${
            i + 1
          }/${totalBatches})`
        );
        const scrapedBatch = await scrapeData(batches[i]);
        allScrapedData = [...allScrapedData, ...scrapedBatch];
        console.log(`スクレイピングデータ (バッチ ${i + 1}/${totalBatches})`);
        console.log(JSON.stringify(scrapedBatch, null, 2));

        // Process scraped data
        setCurrentPhase(
          `kintoneに追加するためにデータを整形中です... (バッチ ${
            i + 1
          }/${totalBatches})`
        );
        const processedBatch = processScrapedData(scrapedBatch);
        allProcessedData = [...allProcessedData, ...processedBatch];
        console.log(`処理データ (バッチ ${i + 1}/${totalBatches})`);
        console.log(JSON.stringify(processedBatch, null, 2));

        // Add to Kintone
        setCurrentPhase(
          `kintoneに情報を追加中です... (バッチ ${i + 1}/${totalBatches})`
        );
        const kintoneResultsBatch = await addToKintone(processedBatch);
        allKintoneResults = [...allKintoneResults, ...kintoneResultsBatch];

        // Update progress
        setProgress(((i + 1) / totalBatches) * 100);
      }

      setResults(allKintoneResults);
    } catch (error) {
      console.error("Error during execution:", error);
      setError("エラーが発生しました。詳細はコンソールを確認してください。");
    } finally {
      setIsLoading(false);
      setCurrentPhase(null);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <ExecuteButton onClick={handleExecute} disabled={isLoading} />
      {isLoading && (
        <div className="mt-4">
          <LoadingIndicator message={currentPhase} />
          <ProgressBar progress={progress} />
        </div>
      )}
      {error && <div className="mt-4 text-red-600">{error}</div>}
      {results && <ResultsTable data={results} />}
    </div>
  );
}

async function fetchSpreadsheetData() {
  const response = await fetch("/api/fetchSpreadsheetData");
  if (!response.ok) throw new Error("Failed to fetch spreadsheet data");
  return response.json();
}

async function scrapeData(spreadsheetData: any[]) {
  const response = await fetch("/api/scrapeData", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(spreadsheetData),
  });
  if (!response.ok) throw new Error(`Failed to scrape data`);
  return response.json();
}

async function addToKintone(scrapedData: any[]) {
  const response = await fetch("/api/addToKintone", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(scrapedData),
  });
  if (!response.ok) throw new Error("Failed to add data to Kintone");
  return response.json();
}
