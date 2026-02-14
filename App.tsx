
import React, { useState, useRef } from 'react';
import { 
  FileText, 
  Upload, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ArrowLeft,
  Search,
  Users
} from 'lucide-react';
import { VoterData, ExtractionStatus, AppState } from './types';
import { convertPdfToImages, generateCSV, downloadCSV } from './utils/pdfUtils';
import { extractDataFromImages } from './services/geminiService';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    status: ExtractionStatus.IDLE,
    progress: 0,
    data: [],
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setState({
      status: ExtractionStatus.IDLE,
      progress: 0,
      data: [],
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setState(prev => ({ ...prev, status: ExtractionStatus.ERROR, error: 'Please select a valid PDF file.' }));
      return;
    }

    try {
      setState({
        status: ExtractionStatus.READING_PDF,
        progress: 0,
        data: [],
        fileName: file.name
      });

      // Step 1: Convert PDF to Images
      const images = await convertPdfToImages(file, (progress) => {
        setState(prev => ({ ...prev, progress: Math.round(progress * 0.3) })); // First 30% of progress
      });

      // Step 2: Extract with Gemini
      setState(prev => ({ ...prev, status: ExtractionStatus.EXTRACTING }));
      const extractedVoters = await extractDataFromImages(images);

      setState(prev => ({
        ...prev,
        status: ExtractionStatus.COMPLETED,
        progress: 100,
        data: extractedVoters
      }));

    } catch (err: any) {
      setState(prev => ({
        ...prev,
        status: ExtractionStatus.ERROR,
        error: err.message || 'An unexpected error occurred during processing.'
      }));
    }
  };

  const handleDownload = () => {
    const csv = generateCSV(state.data);
    const name = state.fileName?.replace('.pdf', '') || 'voter_data';
    downloadCSV(csv, `${name}_extracted.csv`);
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-gray-50 shadow-2xl relative overflow-hidden">
      {/* Android Style Header */}
      <header className="bg-indigo-600 text-white p-4 shadow-md flex items-center gap-4 sticky top-0 z-10">
        {state.status !== ExtractionStatus.IDLE && (
          <button onClick={reset} className="hover:bg-indigo-700 p-1 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
        )}
        <h1 className="text-xl font-medium flex-1">Marathi Extractor</h1>
        <div className="flex gap-2">
          {state.status === ExtractionStatus.COMPLETED && (
             <button onClick={handleDownload} className="p-1 hover:bg-indigo-700 rounded-full transition-colors">
               <Download size={22} />
             </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 pb-24">
        {state.status === ExtractionStatus.IDLE && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
            <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
              <FileText size={48} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Extract Voter Data</h2>
              <p className="text-gray-500 mt-2 px-8">
                Upload your Marathi PDF voter list to extract Names, Ages, Genders, Addresses, and EPIC Numbers.
              </p>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-indigo-600 text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-indigo-700 active:scale-95 transition-all flex items-center gap-2"
            >
              <Upload size={20} />
              SELECT PDF
            </button>
          </div>
        )}

        {(state.status === ExtractionStatus.READING_PDF || state.status === ExtractionStatus.EXTRACTING) && (
          <div className="flex flex-col items-center justify-center h-full space-y-8">
            <div className="relative w-32 h-32">
              <Loader2 size={128} className="text-indigo-600 animate-spin opacity-20" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-indigo-700">{state.progress}%</span>
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-800">
                {state.status === ExtractionStatus.READING_PDF ? 'Reading PDF Pages...' : 'AI Extracting Marathi Text...'}
              </h3>
              <p className="text-gray-500 mt-1">This might take a minute for large files</p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 px-1">
              <div 
                className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300" 
                style={{ width: `${state.progress}%` }}
              />
            </div>
          </div>
        )}

        {state.status === ExtractionStatus.COMPLETED && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-green-50 border border-green-200 p-4 rounded-xl flex items-center gap-3">
              <CheckCircle2 className="text-green-600" size={24} />
              <div>
                <p className="font-semibold text-green-800">Extraction Successful!</p>
                <p className="text-sm text-green-600">Found {state.data.length} records</p>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider px-1 flex items-center gap-2">
                <Users size={16} />
                Previewing Extracted Data
              </h4>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y">
                {state.data.length > 0 ? (
                  state.data.map((voter, idx) => (
                    <div key={idx} className="p-4 space-y-2">
                      <div className="flex justify-between items-start">
                        <h5 className="font-bold text-gray-800 text-lg">{voter.name || 'Unknown Name'}</h5>
                        <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-2 py-1 rounded">
                          {voter.epic_number || 'NO EPIC'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="text-gray-500">Age: <span className="text-gray-800 font-medium">{voter.age}</span></div>
                        <div className="text-gray-500">Gender: <span className="text-gray-800 font-medium">{voter.gender}</span></div>
                      </div>
                      <p className="text-sm text-gray-500 line-clamp-1 italic">{voter.address}</p>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-gray-400">No data could be extracted.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {state.status === ExtractionStatus.ERROR && (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-4">
            <AlertCircle size={64} className="text-red-500" />
            <h3 className="text-xl font-bold text-gray-800">Something went wrong</h3>
            <p className="text-red-600 bg-red-50 p-4 rounded-lg w-full text-sm">
              {state.error}
            </p>
            <button
              onClick={reset}
              className="bg-gray-800 text-white px-6 py-2 rounded-full font-medium hover:bg-gray-900 transition-colors"
            >
              TRY AGAIN
            </button>
          </div>
        )}
      </main>

      {/* Floating Action Buttons / Sticky Footer */}
      {state.status === ExtractionStatus.COMPLETED && (
        <div className="absolute bottom-6 right-6 flex flex-col gap-3">
          <button
            onClick={handleDownload}
            className="bg-green-600 text-white w-14 h-14 rounded-full shadow-2xl flex items-center justify-center hover:bg-green-700 active:scale-90 transition-all"
            title="Download CSV"
          >
            <Download size={24} />
          </button>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pdf"
        className="hidden"
      />

      {/* Material Style Navigation Bar (Visual Only) */}
      <nav className="h-16 bg-white border-t border-gray-100 flex items-center justify-around text-gray-400 sticky bottom-0">
        <button onClick={reset} className={`flex flex-col items-center gap-1 ${state.status === ExtractionStatus.IDLE ? 'text-indigo-600' : ''}`}>
          <Upload size={20} />
          <span className="text-xs">Upload</span>
        </button>
        <div className={`flex flex-col items-center gap-1 ${state.status === ExtractionStatus.COMPLETED ? 'text-indigo-600' : ''}`}>
          <Search size={20} />
          <span className="text-xs">Results</span>
        </div>
      </nav>
    </div>
  );
};

export default App;
