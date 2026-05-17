import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { X, Check } from 'lucide-react';
import { cn } from '../types';
import { useSettingStore } from '../store/settingStore';

interface AvatarCropperModalProps {
  imageSrc: string;
  onCropComplete: (croppedImage: string) => void;
  onCancel: () => void;
}

export const AvatarCropperModal: React.FC<AvatarCropperModalProps> = ({ imageSrc, onCropComplete, onCancel }) => {
  const { theme } = useSettingStore(s => s.uiConfig);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onCropCompleteHandler = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createCroppedImage = async () => {
    try {
      if (!croppedAreaPixels) return;
      
      const image = new Image();
      image.src = imageSrc;
      await new Promise((resolve) => { image.onload = resolve; });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = 256; // Fixed size for avatar
      canvas.height = 256;

      ctx.drawImage(
        image,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        256,
        256
      );

      const base64Image = canvas.toDataURL('image/jpeg', 0.9);
      onCropComplete(base64Image);
    } catch (e) {
      console.error(e);
      onCancel();
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className={cn(
        "w-full max-w-sm rounded-2xl shadow-xl overflow-hidden flex flex-col",
        theme === 'dark' ? "bg-[#111111] border-white/10" : "bg-white border-[#E5E7EB]"
      )}>
        <div className="p-4 border-b border-gray-200 dark:border-white/10 flex justify-between items-center">
          <h3 className="font-bold text-sm">裁剪头像</h3>
          <button onClick={onCancel} className="p-1 hover:bg-white/10 rounded-lg">
            <X size={16} />
          </button>
        </div>
        
        <div className="relative h-64 w-full bg-black">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1} // Square crop
            cropShape="rect" // Or "round"
            onCropChange={setCrop}
            onCropComplete={onCropCompleteHandler}
            onZoomChange={setZoom}
          />
        </div>

        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">缩放</span>
            <input 
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1"
            />
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className={cn(
                "flex-1 py-2 rounded-xl text-sm font-bold transition-colors",
                theme === 'dark' ? "bg-white/5 hover:bg-white/10" : "bg-gray-100 hover:bg-gray-200"
              )}
            >
              取消
            </button>
            <button
              onClick={createCroppedImage}
              className="flex-1 py-2 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2"
            >
              <Check size={16} /> 保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
