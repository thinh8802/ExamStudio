import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Edit, Trash2, Library, Plus, Folder, UploadCloud } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useFlashcardStore } from '@/stores/flashcard-store';
import { useAppStore } from '@/stores/app-store';
import { flashcardRepository } from '@/services/repositories/flashcard-repository';
import type { FlashcardDeck, Flashcard } from '@/types';

export interface FolderNode {
  name: string;
  fullName: string;
  count: number;
  children: FolderNode[];
}

export const FlashcardDeckPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { theme } = useAppStore();
  const isDarkMode = theme === 'dark';
  
  const [deck, setDeck] = useState<FlashcardDeck | null>(null);
  const [stats, setStats] = useState({ total: 0, new: 0, learning: 0, review: 0, mastered: 0, due: 0 });
  const [topics, setTopics] = useState<FolderNode[]>([]);
  const [untaggedCount, setUntaggedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRootDragOver, setIsRootDragOver] = useState(false);

  const loadTopics = async (deckId: string, currentFolders: string[]) => {
    const cards = await flashcardRepository.getCardsByDeck(deckId);
    const topicMap = new Map<string, number>();

    const untagged = cards.filter(c => !c.tags || c.tags.length === 0);
    setUntaggedCount(untagged.length);

    if (currentFolders) {
      currentFolders.forEach(f => {
        const parts = f.split('/');
        let currentPath = '';
        parts.forEach(p => {
          currentPath = currentPath ? `${currentPath}/${p}` : p;
          if (!topicMap.has(currentPath)) {
            topicMap.set(currentPath, 0);
          }
        });
      });
    }

    cards.forEach(c => {
      if (c.tags && c.tags.length > 0) {
        c.tags.forEach(tag => {
          // Normalize tag matching: match against currentFolders (full path or leaf name)
          let matchedFolder = (currentFolders || []).find(f => f === tag || tag.startsWith(`${f}/`));
          if (!matchedFolder) {
            matchedFolder = (currentFolders || []).find(f => f.split('/').pop() === tag);
          }

          const pathToTally = matchedFolder || tag;
          const parts = pathToTally.split('/');
          let currentPath = '';
          parts.forEach(p => {
            currentPath = currentPath ? `${currentPath}/${p}` : p;
            topicMap.set(currentPath, (topicMap.get(currentPath) || 0) + 1);
          });
        });
      }
    });
    
    const rootNodes: FolderNode[] = [];
    const nodeMap = new Map<string, FolderNode>();
    const sortedPaths = Array.from(topicMap.keys()).sort();
    
    sortedPaths.forEach(path => {
      const parts = path.split('/');
      const name = parts[parts.length - 1];
      const count = topicMap.get(path) || 0;
      
      const node: FolderNode = { name, fullName: path, count, children: [] };
      nodeMap.set(path, node);
      
      if (parts.length === 1) {
        rootNodes.push(node);
      } else {
        const parentPath = parts.slice(0, -1).join('/');
        const parentNode = nodeMap.get(parentPath);
        if (parentNode) {
          parentNode.children.push(node);
        } else {
          rootNodes.push(node);
        }
      }
    });
    
    setTopics(rootNodes);
  };

  const handleAssignUntaggedCards = async (targetFolder?: string) => {
    if (!deck) return;
    const folderList = deck.folders || [];
    if (folderList.length === 0) {
      toast.error('Chưa có thư mục nào trong bộ thẻ. Vui lòng tạo thư mục trước.');
      return;
    }

    let selected = targetFolder;
    if (!selected) {
      const optionsStr = folderList.map((f, i) => `${i + 1}. ${f}`).join('\n');
      const input = window.prompt(`Nhập số thứ tự thư mục muốn gán ${untaggedCount} thẻ chưa phân loại vào:\n\n${optionsStr}`);
      if (!input) return;
      const num = parseInt(input.trim(), 10);
      if (isNaN(num) || num < 1 || num > folderList.length) {
        toast.error('Số thứ tự không hợp lệ.');
        return;
      }
      selected = folderList[num - 1];
    }

    try {
      const cards = await flashcardRepository.getCardsByDeck(deck.id);
      const untaggedCards = cards.filter(c => !c.tags || c.tags.length === 0);
      for (const card of untaggedCards) {
        await flashcardRepository.updateCard(card.id, { tags: [selected] });
      }
      toast.success(`Đã gán ${untaggedCards.length} thẻ vào thư mục "${selected}"!`);
      const s = await flashcardRepository.getDeckStats(deck.id);
      setStats(s);
      await loadTopics(deck.id, folderList);
    } catch (e) {
      toast.error('Có lỗi xảy ra khi gán thẻ vào thư mục.');
    }
  };

  useEffect(() => {
    async function load() {
      if (!id) return;
      setIsLoading(true);
      const d = await flashcardRepository.getDeck(id);
      if (d) {
        setDeck(d);
        const s = await flashcardRepository.getDeckStats(id);
        setStats(s);
        await loadTopics(id, d.folders || []);
      }
      setIsLoading(false);
    }
    load();
  }, [id]);

  const handleCreateFolder = async (parentPath?: string) => {
    if (!deck) return;
    const promptMsg = parentPath 
      ? `Nhập tên thư mục con trong "${parentPath.split('/').pop()}":` 
      : 'Nhập tên Chủ đề (Folder) mới:';
    
    const folderName = window.prompt(promptMsg);
    if (!folderName || !folderName.trim()) return;
    
    if (folderName.includes('/')) {
      toast.error('Tên thư mục không được chứa ký tự "/"');
      return;
    }

    const name = folderName.trim();
    const fullName = parentPath ? `${parentPath}/${name}` : name;
    
    if (deck.folders && deck.folders.includes(fullName)) {
      toast.error('Chủ đề này đã tồn tại!');
      return;
    }

    try {
      const newFolders = [...(deck.folders || []), fullName];
      await flashcardRepository.updateDeck(deck.id, { folders: newFolders });
      setDeck({ ...deck, folders: newFolders });
      await loadTopics(deck.id, newFolders);
      toast.success('Đã thêm chủ đề mới!');
    } catch (e) {
      toast.error('Có lỗi xảy ra khi tạo chủ đề.');
    }
  };

  const handleDeleteFolder = async (folderPath: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!deck) return;
    if (!window.confirm(`Bạn có chắc chắn muốn xóa chủ đề "${folderPath}" không? Các thẻ trong chủ đề này (và các chủ đề con) sẽ bị xóa thẻ (tag).`)) return;
    
    try {
      const newFolders = (deck.folders || []).filter(f => f !== folderPath && !f.startsWith(`${folderPath}/`));
      await flashcardRepository.updateDeck(deck.id, { folders: newFolders });
      setDeck({ ...deck, folders: newFolders });
      
      const cards = await flashcardRepository.getCardsByDeck(deck.id);
      for (const card of cards) {
        if (card.tags && card.tags.some(t => t === folderPath || t.startsWith(`${folderPath}/`))) {
          const newTags = card.tags.filter(t => t !== folderPath && !t.startsWith(`${folderPath}/`));
          await flashcardRepository.updateCard(card.id, { tags: newTags });
        }
      }

      await loadTopics(deck.id, newFolders);
      toast.success('Đã xóa chủ đề!');
    } catch (e) {
      toast.error('Có lỗi xảy ra khi xóa chủ đề.');
    }
  };

  const handleMoveFolder = async (sourcePath: string, targetPath: string) => {
    if (!deck) return;
    
    const sourceName = sourcePath.split('/').pop();
    const newPath = targetPath === 'ROOT' ? sourceName! : `${targetPath}/${sourceName}`;
    
    if (sourcePath === newPath) return; // No change

    try {
      const newFolders = (deck.folders || []).map(f => {
        if (f === sourcePath) return newPath;
        if (f.startsWith(`${sourcePath}/`)) return f.replace(`${sourcePath}/`, `${newPath}/`);
        return f;
      });
      const uniqueFolders = Array.from(new Set(newFolders));
      await flashcardRepository.updateDeck(deck.id, { folders: uniqueFolders });
      
      const cards = await flashcardRepository.getCardsByDeck(deck.id);
      for (const card of cards) {
        if (card.tags && card.tags.some(t => t === sourcePath || t.startsWith(`${sourcePath}/`))) {
          const newTags = card.tags.map(t => {
            if (t === sourcePath) return newPath;
            if (t.startsWith(`${sourcePath}/`)) return t.replace(`${sourcePath}/`, `${newPath}/`);
            return t;
          });
          const uniqueTags = Array.from(new Set(newTags));
          await flashcardRepository.updateCard(card.id, { tags: uniqueTags });
        }
      }

      setDeck({ ...deck, folders: uniqueFolders });
      await loadTopics(deck.id, uniqueFolders);
      toast.success('Đã di chuyển thư mục!');
    } catch (e) {
      toast.error('Có lỗi xảy ra khi di chuyển thư mục.');
    }
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen p-6 flex justify-center items-center ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!deck) {
    return (
      <div className={`min-h-screen p-6 flex flex-col justify-center items-center ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <h2 className="text-2xl font-bold">Không tìm thấy Bộ thẻ</h2>
        <button 
          onClick={() => navigate('/flashcards')}
          className="mt-4 text-blue-500 hover:underline"
        >
          Quay lại
        </button>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-4 md:p-6 lg:p-8 ${isDarkMode ? 'bg-gray-950 text-white' : 'bg-gray-100/80 text-gray-900'}`}>
      <div className={`w-full max-w-full 2xl:max-w-[1600px] mx-auto p-6 md:p-10 rounded-[2rem] shadow-sm border ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} space-y-8`}>
        
        {/* Header */}
        <div>
          <button 
            onClick={() => navigate('/flashcards')}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Tất cả bộ thẻ
          </button>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                  <Library className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </span>
                <h1 className="text-3xl font-bold">{deck.name}</h1>
              </div>
              <p className={`text-lg ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {deck.description || 'Chưa có mô tả cho bộ thẻ này.'}
              </p>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => navigate('/flashcards/new', { state: { deckId: deck.id } })}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-medium transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">Thêm thẻ</span>
              </button>
              <button className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <Edit className="w-5 h-5 text-gray-500" />
              </button>
              <button className="p-2.5 rounded-xl border border-red-200 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-900/20 transition-colors text-red-500">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Stats & Actions */}
        <div className={`p-8 rounded-2xl ${isDarkMode ? 'bg-gray-800/50' : 'bg-gray-50 border border-gray-100'}`}>
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex-1 w-full grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
              <div>
                <p className="text-3xl font-bold">{stats.total}</p>
                <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Tổng số thẻ</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-blue-500">{stats.due}</p>
                <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Cần ôn hôm nay</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-orange-500">{stats.learning}</p>
                <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Đang học</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-green-500">{stats.mastered}</p>
                <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Thành thạo</p>
              </div>
            </div>

            <div className="w-full md:w-auto">
              <button 
                disabled={stats.total === 0}
                onClick={() => {
                  if (stats.due > 0) navigate(`/flashcards/session/${deck.id}`);
                  else navigate(`/flashcards/session/${deck.id}?mode=all`);
                }}
                className={`w-full flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-lg transition-transform active:scale-95 ${
                  stats.total > 0 
                    ? stats.due > 0
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30'
                      : 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                    : isDarkMode ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                <Play className="w-6 h-6 fill-current" />
                {stats.total === 0 ? 'Chưa có thẻ' : stats.due > 0 ? `Ôn ngay (${stats.due})` : 'Học tự do'}
              </button>
            </div>
          </div>
        </div>

        {/* Topics / Folders */}
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Folder className="w-6 h-6 text-purple-500" />
              Cấu trúc Thư mục (Folders)
            </h3>
            <button
              onClick={() => handleCreateFolder()}
              className="flex items-center gap-2 text-sm font-medium text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 dark:text-purple-400 px-4 py-2 rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" /> Thư mục gốc mới
            </button>
          </div>
          
          {untaggedCount > 0 && (
            <div className={`p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 border ${
              isDarkMode ? 'bg-amber-950/30 border-amber-800/50 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}>
              <div className="flex items-center gap-3">
                <span className="text-xl">💡</span>
                <div>
                  <p className="font-semibold text-sm">Có {untaggedCount} thẻ chưa được phân loại vào thư mục</p>
                  <p className="text-xs opacity-80">Các thẻ này hiện nằm ở bộ thẻ chung. Bạn có thể gán nhanh chúng vào thư mục bên dưới.</p>
                </div>
              </div>
              <button
                onClick={() => handleAssignUntaggedCards()}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-sm"
              >
                Gán {untaggedCount} thẻ vào thư mục &rarr;
              </button>
            </div>
          )}

          {/* Root Dropzone (Only visible when dragging) */}
          <div 
            onDragOver={(e) => { e.preventDefault(); setIsRootDragOver(true); }}
            onDragLeave={() => setIsRootDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsRootDragOver(false);
              const sourcePath = e.dataTransfer.getData('text/plain');
              if (sourcePath && sourcePath.includes('/')) {
                handleMoveFolder(sourcePath, 'ROOT');
              }
            }}
            className={`w-full py-4 border-2 border-dashed rounded-xl flex items-center justify-center gap-2 text-gray-500 font-medium transition-all ${
              isRootDragOver 
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 opacity-100' 
                : 'border-transparent opacity-0 h-0 py-0 overflow-hidden'
            }`}
          >
            <UploadCloud className="w-5 h-5" /> Thả vào đây để đưa ra ngoài cùng (Root)
          </div>

          {topics.length > 0 ? (
            <div className="space-y-4">
              {topics.map(topic => (
                <FolderTreeItem 
                  key={topic.fullName} 
                  node={topic} 
                  deckId={deck.id} 
                  isDarkMode={isDarkMode} 
                  onDelete={handleDeleteFolder} 
                  onMove={handleMoveFolder}
                  onCreateChild={handleCreateFolder}
                />
              ))}
            </div>
          ) : (
            <div className={`text-center p-8 border-2 border-dashed rounded-xl ${isDarkMode ? 'border-gray-700 text-gray-500' : 'border-gray-300 text-gray-400'}`}>
              Chưa có chủ đề nào. Hãy bấm "Thư mục gốc mới".
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

const FolderTreeItem: React.FC<{
  node: FolderNode;
  deckId: string;
  isDarkMode: boolean;
  onDelete: (path: string, e: React.MouseEvent) => void;
  onMove: (sourcePath: string, targetPath: string) => void;
  onCreateChild: (parentPath: string) => void;
}> = ({ node, deckId, isDarkMode, onDelete, onMove, onCreateChild }) => {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', node.fullName);
    e.stopPropagation();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const sourcePath = e.dataTransfer.getData('text/plain');
    if (sourcePath && sourcePath !== node.fullName && !node.fullName.startsWith(`${sourcePath}/`)) {
      onMove(sourcePath, node.fullName);
    }
  };

  return (
    <div className="flex flex-col">
      <div 
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => {
          // If it has children, toggle expansion
          if (node.children.length > 0) {
            setIsExpanded(!isExpanded);
          } else {
            // Leaf node behavior
            if (node.count === 0) {
              toast('Chủ đề này chưa có thẻ nào. Hãy thêm thẻ nhé!', { icon: '📂' });
              navigate('/flashcards/quick-create', { state: { deckId, initialTopic: node.fullName } });
            } else {
              navigate(`/flashcards/session/${deckId}?mode=all&tag=${encodeURIComponent(node.fullName)}`);
            }
          }
        }}
        className={`p-4 rounded-xl border transition-all flex items-center justify-between gap-3 group cursor-pointer ${
          isDragOver 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-500' 
            : isDarkMode 
              ? 'border-gray-700 bg-gray-800 hover:bg-gray-700' 
              : 'border-gray-200 bg-white hover:bg-gray-50 hover:border-purple-300'
        }`}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg shrink-0 group-hover:scale-110 transition-transform">
            <Folder className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <span className="font-bold text-gray-900 dark:text-white break-words">{node.name}</span>
          {node.children.length > 0 && (
            <button 
              onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
              className={`px-2 py-1 rounded text-xs transition-colors font-medium ${
                isExpanded 
                  ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {isExpanded ? 'Thu gọn' : `+ ${node.children.length} thư mục con`}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-medium text-gray-500 bg-gray-100 dark:bg-gray-900 px-3 py-1 rounded-full">{node.count} thẻ</span>
          
          {node.count > 0 && (
            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                navigate(`/flashcards/session/${deckId}?mode=all&tag=${encodeURIComponent(node.fullName)}`);
              }}
              className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
              title="Học thư mục này"
            >
              <Play className="w-5 h-5 fill-current" />
            </button>
          )}
          
          <button 
            onClick={(e) => { 
              e.stopPropagation(); 
              navigate('/flashcards/quick-create', { state: { deckId, initialTopic: node.fullName } });
            }}
            className="p-2 text-gray-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
            title="Thêm thẻ vào thư mục này"
          >
            <UploadCloud className="w-5 h-5" />
          </button>

          <button 
            onClick={(e) => { e.stopPropagation(); onCreateChild(node.fullName); }}
            className="p-2 text-gray-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
            title="Thêm thư mục con"
          >
            <Plus className="w-5 h-5" />
          </button>
          
          <button 
            onClick={(e) => onDelete(node.fullName, e)}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
            title="Xóa thư mục"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {isExpanded && node.children.length > 0 && (
        <div className="pl-6 md:pl-10 mt-3 ml-4 border-l-2 border-gray-200 dark:border-gray-700 space-y-3 relative">
          {node.children.map(child => (
            <div key={child.fullName} className="relative">
              {/* Connector line for visual tree effect */}
              <div className="absolute -left-6 md:-left-10 top-1/2 w-6 md:w-10 border-t-2 border-gray-200 dark:border-gray-700 pointer-events-none"></div>
              <FolderTreeItem 
                node={child} 
                deckId={deckId} 
                isDarkMode={isDarkMode} 
                onDelete={onDelete} 
                onMove={onMove}
                onCreateChild={onCreateChild}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
