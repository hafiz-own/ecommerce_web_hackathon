import React, { useState, useRef } from 'react';
import { generateTryOn, TryOnResponse } from '../lib/api/ai';
import { X, Upload, User } from 'lucide-react';

interface TryOnModalProps {
  open: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
}

export default function TryOnModal({ open, onClose, productId, productName }: TryOnModalProps) {
  const [mode, setMode] = useState<'model' | 'user'>('model');
  const [userPhoto, setUserPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TryOnResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUserPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (mode === 'user' && !userPhoto) {
      alert('Please upload a photo');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await generateTryOn(productId, mode === 'model', userPhoto || undefined);
      setResult(response);
    } catch (error) {
      console.error('[TryOnModal] Error:', error);
      alert('Failed to generate try-on image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setMode('model');
    setUserPhoto(null);
    setPreview(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Virtual Try-On: {productName}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {!result ? (
            <>
              <div className="mb-6">
                <label className="block text-sm font-medium mb-3">Choose try-on mode:</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setMode('model')}
                    className={`p-4 border rounded-lg flex flex-col items-center gap-2 transition-colors ${
                      mode === 'model' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <User className="w-8 h-8" />
                    <span className="text-sm font-medium">AI Model</span>
                    <span className="text-xs text-gray-500">Use an AI-generated model</span>
                  </button>
                  <button
                    onClick={() => setMode('user')}
                    className={`p-4 border rounded-lg flex flex-col items-center gap-2 transition-colors ${
                      mode === 'user' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <Upload className="w-8 h-8" />
                    <span className="text-sm font-medium">Your Photo</span>
                    <span className="text-xs text-gray-500">Upload your own photo</span>
                  </button>
                </div>
              </div>

              {mode === 'user' && (
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2">Upload your photo:</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
                  >
                    {preview ? (
                      <img src={preview} alt="Preview" className="w-full h-48 object-cover rounded" />
                    ) : (
                      <div className="text-center">
                        <Upload className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm text-gray-600">Click to upload your photo</p>
                        <p className="text-xs text-gray-500">JPG, PNG up to 5MB</p>
                      </div>
                    )}
                  </button>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleGenerate}
                  disabled={loading || (mode === 'user' && !userPhoto)}
                  className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Generating...' : 'Generate Try-On'}
                </button>
                <button
                  onClick={reset}
                  disabled={loading}
                  className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Reset
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2">Your Try-On Result</h3>
                {result.cached && (
                  <p className="text-sm text-green-600 mb-2">✨ Using cached model try-on</p>
                )}
                <img
                  src={result.try_on_url}
                  alt="Try-on result"
                  className="w-full rounded-lg border"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => window.open(result.try_on_url, '_blank')}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  View Full Size
                </button>
                <button
                  onClick={reset}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
