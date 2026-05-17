import React from 'react';
import { motion } from 'motion/react';
import { X, ExternalLink, Download } from 'lucide-react';
import { cn, Message } from '../types';
import { useSettingStore } from '../store/settingStore';
import { useUIStore } from '../store/uiStore';

interface ImageGalleryModalProps {
  messages: Message[];
}

export const ImageGalleryModal: React.FC<ImageGalleryModalProps> = ({ messages }) => {
  const { theme } = useSettingStore(s => s.uiConfig);
  const { isImageGalleryOpen, setImageGalleryOpen } = useUIStore();

  if (!isImageGalleryOpen) return null;

  const images = messages.filter(m => m.imageUrl).map(m =>({ id: m.id, url: m.imageUrl!, prompt: m.content }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={cn(
          "w-full max-w-4xl h-[80vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden border",
          theme === 'dark' ? "bg-[#111111] border-white/10" : "bg-white border-gray-200"
        )}
      >
        <div className={cn(
          "p-4 border-b flex justify-between items-center shrink-0",
          theme === 'dark' ? "border-white/10" : "border-gray-100"
        )}>
          <h3 className={cn("text-lg font-bold", theme === 'dark' ? "text-white" : "text-gray-900")}>
            当前对话图库 ({images.length})
          </h3>
          <button 
            onClick={() => setImageGalleryOpen(false)}
            className={cn(
              "p-2 rounded-full transition-colors",
              theme === 'dark' ? "hover:bg-white/10 text-gray-400 text-white" : "hover:bg-gray-100 text-gray-500"
            )}
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {images.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-4">
              <span className="text-4xl">🎨</span>
              <p>当前对话还没有生成图片</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {images.map((img) => (
                <div key={img.id} className="relative group rounded-xl overflow-hidden bg-gray-100 dark:bg-white/5 border border-transparent dark:border-white/10 shadow-sm transition-all hover:scale-[1.02]">
                  <img src={img.url} className="w-full aspect-square object-cover cursor-zoom-in" alt="AI Generated" onClick={() => window.open(img.url, '_blank')} referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3 pointer-events-none">
                    <p className="text-xs text-white line-clamp-3 font-medium pointer-events-auto">{img.prompt}</p>
                    <div className="flex items-center gap-2 mt-3 pointer-events-auto">
                      <a href={img.url} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-white/20 hover:bg-white/40 rounded-lg text-white backdrop-blur-sm transition-colors" title="在新标签页放大">
                         <ExternalLink size={16} />
                      </a>
                      <a href={img.url} download={`gallery_${img.id}.png`} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-white hover:bg-gray-100 text-black rounded-lg transition-colors ml-auto shadow-sm" title="下载图片">
                         <Download size={16} />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
