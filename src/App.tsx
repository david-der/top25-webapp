import React, { useState, useCallback, useRef, useEffect } from 'react';
import './App.css';

interface ListItem {
  id: string;
  imageUrl: string;
}

const App: React.FC = () => {
  const [topList, setTopList] = useState<(ListItem | null)[]>(
    Array(25).fill(null)
  );
  const [draggedItem, setDraggedItem] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [manualImageUrl, setManualImageUrl] = useState<string>('');
  const [recentImages, setRecentImages] = useState<string[]>([]);
  const [listTitle, setListTitle] = useState<string>('Top 25');
  const [isEditingTitle, setIsEditingTitle] = useState<boolean>(false);
  const dragCounter = useRef(0);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const touchedItem = useRef<number | null>(null);

  // Load persisted data on startup
  useEffect(() => {
    try {
      const savedList = localStorage.getItem('topList');
      if (savedList) {
        const parsed = JSON.parse(savedList);
        if (Array.isArray(parsed) && parsed.length === 25) {
          setTopList(parsed);
        }
      }
      const savedRecent = localStorage.getItem('recentImages');
      if (savedRecent) {
        const parsedRecent = JSON.parse(savedRecent);
        if (Array.isArray(parsedRecent)) {
          setRecentImages(parsedRecent);
        }
      }
      const savedTitle = localStorage.getItem('listTitle');
      if (savedTitle) {
        setListTitle(savedTitle);
      }
    } catch {
      // Ignore JSON parse errors
    }
  }, []);

  // Persist data whenever it changes
  useEffect(() => {
    localStorage.setItem('topList', JSON.stringify(topList));
  }, [topList]);

  useEffect(() => {
    localStorage.setItem('listTitle', listTitle);
  }, [listTitle]);

  useEffect(() => {
    localStorage.setItem('recentImages', JSON.stringify(recentImages));
  }, [recentImages]);

  const addManualItem = useCallback(() => {
    if (!manualImageUrl.trim()) return;
    
    const nextEmptyIndex = topList.findIndex(item => item === null);
    if (nextEmptyIndex === -1) return; // List is full

    const newItem: ListItem = {
      id: `${Date.now()}-${Math.random()}`,
      imageUrl: manualImageUrl.trim()
    };

    setTopList(prev => {
      const newList = [...prev];
      newList[nextEmptyIndex] = newItem;
      return newList;
    });

    setRecentImages(prev => {
      const url = manualImageUrl.trim();
      const updated = [url, ...prev.filter((u) => u !== url)];
      return updated.slice(0, 10);
    });

    // Clear input
    setManualImageUrl('');
  }, [manualImageUrl, topList]);

  const removeFromList = useCallback((index: number) => {
    setTopList(prev => {
      const newList = [...prev];
      // Remove the item at the specified index
      newList.splice(index, 1);
      // Add a null at the end to maintain 25 slots
      newList.push(null);
      return newList;
    });
  }, []);

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    if (!topList[index]) return;
    
    setDraggedItem(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', index.toString());
    
    // Create a custom drag image
    const dragElement = e.currentTarget as HTMLElement;
    const rect = dragElement.getBoundingClientRect();
    e.dataTransfer.setDragImage(dragElement, rect.width / 2, rect.height / 2);
  }, [topList]);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current++;
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setDragOverIndex(null);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    dragCounter.current = 0;
    
    if (draggedItem === null) {
      setDraggedItem(null);
      setDragOverIndex(null);
      return;
    }

    setTopList(prev => {
      const newList = [...prev];
      
      // If we're dropping on the same position, do nothing
      if (draggedItem === dropIndex) {
        return prev;
      }
      
      // Get the item being dragged
      const draggedItemData = newList[draggedItem];
      
      // Remove the dragged item from its original position
      newList.splice(draggedItem, 1);
      
      // Adjust drop index if we removed an item before it
      const adjustedDropIndex = draggedItem < dropIndex ? dropIndex - 1 : dropIndex;
      
      // Insert the item at the new position
      newList.splice(adjustedDropIndex, 0, draggedItemData);
      
      // Ensure we still have 25 slots
      while (newList.length < 25) {
        newList.push(null);
      }
      
      return newList;
    });

    setDraggedItem(null);
    setDragOverIndex(null);
  }, [draggedItem]);

  const handleDragEnd = useCallback(() => {
    setDraggedItem(null);
    setDragOverIndex(null);
    dragCounter.current = 0;
  }, []);

  const handleTitleSubmit = useCallback(() => {
    setIsEditingTitle(false);
  }, []);

  // Touch event handlers for mobile drag & drop
  const handleTouchStart = useCallback((e: React.TouchEvent, index: number) => {
    if (!topList[index]) return;
    
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    touchedItem.current = index;
    setDraggedItem(index);
  }, [topList]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault(); // Prevent scrolling
    
    if (touchedItem.current === null) return;
    
    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    
    // Find the closest list slot
    const listSlot = element?.closest('.list-slot');
    if (listSlot) {
      const slots = Array.from(document.querySelectorAll('.list-slot'));
      const targetIndex = slots.indexOf(listSlot);
      if (targetIndex !== -1) {
        setDragOverIndex(targetIndex);
      }
    }
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchedItem.current === null) {
      setDraggedItem(null);
      setDragOverIndex(null);
      return;
    }
    
    const touch = e.changedTouches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    const listSlot = element?.closest('.list-slot');
    
    if (listSlot) {
      const slots = Array.from(document.querySelectorAll('.list-slot'));
      const dropIndex = slots.indexOf(listSlot);
      
      if (dropIndex !== -1 && dropIndex !== touchedItem.current) {
        // Perform the same logic as handleDrop
        setTopList(prev => {
          const newList = [...prev];
          const draggedItemData = newList[touchedItem.current!];
          
          newList.splice(touchedItem.current!, 1);
          const adjustedDropIndex = touchedItem.current! < dropIndex ? dropIndex - 1 : dropIndex;
          newList.splice(adjustedDropIndex, 0, draggedItemData);
          
          while (newList.length < 25) {
            newList.push(null);
          }
          
          return newList;
        });
      }
    }
    
    // Reset touch state
    touchStartPos.current = null;
    touchedItem.current = null;
    setDraggedItem(null);
    setDragOverIndex(null);
  }, []);

  return (
    <div className="app">
      <header>
        {isEditingTitle ? (
          <input
            type="text"
            value={listTitle}
            onChange={(e) => setListTitle(e.target.value)}
            onBlur={handleTitleSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleTitleSubmit();
              }
            }}
            className="title-input"
            autoFocus
          />
        ) : (
          <h1 onClick={() => setIsEditingTitle(true)} className="editable-title">
            {listTitle}
          </h1>
        )}
        
        <div className="manual-input">
          <input
            type="url"
            value={manualImageUrl}
            onChange={(e) => setManualImageUrl(e.target.value)}
            placeholder="Paste image URL and press Enter"
            className="manual-url-input"
            list="recent-images"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                addManualItem();
              }
            }}
          />
          <datalist id="recent-images">
            {recentImages.map((url, idx) => (
              <option value={url} key={idx} />
            ))}
          </datalist>
        </div>
      </header>

      <div className="top-list">
        {topList.map((item, index) => (
          <div
            key={item?.id || `empty-${index}`}
            className={`list-slot ${item ? 'filled' : 'empty'} ${
              draggedItem === index ? 'dragging' : ''
            } ${dragOverIndex === index ? 'drag-over' : ''}`}
            draggable={!!item}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            onTouchStart={(e) => handleTouchStart(e, index)}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onClick={() => item && removeFromList(index)}
          >
            {item ? (
              <>
                <img
                  src={item.imageUrl}
                  alt="List item"
                  onError={(e) => {
                    e.currentTarget.src = `https://picsum.photos/400/300?random=${index + 200}`;
                  }}
                />
                <div className="remove-hint">Click to remove</div>
                <div className="drag-hint">Drag to reorder</div>
              </>
            ) : (
              <div className="empty-slot">
                <div className="empty-text">Empty</div>
              </div>
            )}
          </div>
        ))}
      </div>
      
      <footer className="footer">
        Vibe coded with ❤️ for my squad: Beast, Brink, Dubs, Joshy, K-lbs, Matt, Myles, Rob Dollaz and anyone else that likes making lists.
      </footer>
    </div>
  );
};

export default App;