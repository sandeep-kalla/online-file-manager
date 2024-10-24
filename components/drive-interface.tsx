/* eslint-disable @typescript-eslint/no-unused-vars */
'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Folder, File, FileText, FileImage, FileAudio, FileVideo, 
  FileCode, FileArchive, Plus, Upload, X, ChevronLeft, Check, Download, Trash2, Eye
} from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Toast } from "@/components/ui/toast"
import dynamic from 'next/dynamic'
import { collection, addDoc, getDocs, query, where, onSnapshot, deleteDoc } from "firebase/firestore";
import { db, storage } from "@/firebaseConfig"; // Adjust the path as necessary
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { doc, setDoc } from "firebase/firestore";
import { MoonIcon, SunIcon } from "@radix-ui/react-icons";
import { useTheme } from "next-themes";

const ThemeToggle = dynamic(() => import('@/components/theme-toggle').then(mod => mod.ThemeToggle), { ssr: false })

type FileType = {
  id: string;
  name: string;
  type: 'file' | 'folder';
  path: string;
  url?: string; // Add this for file download URLs
  content?: FileType[]; // Add this line to include content for folders
}

const getFileIcon = (fileName: string) => {
  const extension = fileName.split('.').pop()?.toLowerCase()
  switch (extension) {
    case 'pdf':
      return <FileText className="h-12 w-12 text-red-400 mb-2" />
    case 'doc':
    case 'docx':
    case 'txt':
      return <FileText className="h-12 w-12 text-blue-400 mb-2" />
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
      return <FileImage className="h-12 w-12 text-green-400 mb-2" />
    case 'mp3':
    case 'wav':
      return <FileAudio className="h-12 w-12 text-purple-400 mb-2" />
    case 'mp4':
    case 'avi':
    case 'mov':
      return <FileVideo className="h-12 w-12 text-pink-400 mb-2" />
    case 'js':
    case 'ts':
    case 'html':
    case 'css':
      return <FileCode className="h-12 w-12 text-yellow-400 mb-2" />
    case 'zip':
    case 'rar':
      return <FileArchive className="h-12 w-12 text-orange-400 mb-2" />
    default:
      return <File className="h-12 w-12 text-gray-400 mb-2" />
  }
}

export function DriveInterfaceComponent() {
  // Change the initial state of files to an empty array
  const [files, setFiles] = useState<FileType[]>([])
  const [currentFolder, setCurrentFolder] = useState<FileType | null>(null)
  const [showUploadMenu, setShowUploadMenu] = useState(false)
  const [newFileName, setNewFileName] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [showToast, setShowToast] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showNewFolderMenu, setShowNewFolderMenu] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [currentPath, setCurrentPath] = useState('/')
  const [showDownloadPopup, setShowDownloadPopup] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [selectedFile, setSelectedFile] = useState<FileType | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: FileType | null }>({ x: 0, y: 0, item: null });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<FileType | null>(null);
  const { theme, setTheme } = useTheme();
  const [isLoading, setIsLoading] = useState(true)

  const resetUploadState = useCallback(() => {
    setIsUploading(false)
    setUploadProgress(0)
    setShowUploadMenu(false)
  }, [])

  const handleDoubleClick = useCallback((event: React.MouseEvent, item: FileType) => {
    event.preventDefault()
    event.stopPropagation()
    if (item.type === 'folder') {
      setCurrentPath(prevPath => prevPath === '/' ? `/${item.name}/` : `${prevPath}${item.name}/`);
    } else {
      setSelectedFile(item)
      setShowDownloadPopup(true)
    }
  }, [])

  const handleBack = () => {
    const pathParts = currentPath.split('/').filter(Boolean);
    const newPath = pathParts.length > 1 
      ? '/' + pathParts.slice(0, -1).join('/') + '/'
      : '/';
    setCurrentPath(newPath);
  }

  const handleCreateFile = () => {
    if (newFileName) {
      const newFile: FileType = {
        id: Date.now().toString(),
        name: newFileName,
        type: 'file',
        path: currentPath
      }
      if (currentFolder) {
        setFiles(prevFiles => prevFiles.map(file => 
          file.id === currentFolder.id 
            ? { ...file, content: [...(file.content || []), newFile] }
            : file
        ))
      } else {
        setFiles(prevFiles => [...prevFiles, newFile])
      }
      setNewFileName('')
    }
  }

  const handleUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return

    setIsUploading(true)
    setUploadProgress(0)

    // Simulating file upload with progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 200))
      setUploadProgress(i)
    }

    // Simulating upload completion
    setTimeout(() => {
      setToastMessage('File uploaded successfully!')
      setShowToast(true)
      resetUploadState()
    }, 500)
  }, [resetUploadState])

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleUpload(event.target.files)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    const files = e.dataTransfer.files
    if (files.length) {
      handleFileUpload(files)
    }
  }

  const handleFileUpload = async (files: FileList) => {
    setIsUploading(true);
    setUploadProgress(0);

    const storage = getStorage();
    const filesRef = collection(db, "files");

    for (const file of Array.from(files)) {
      const storageRef = ref(storage, `${currentPath}${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        }, 
        (error) => {
          console.error("Upload failed:", error);
          showToastMessage('File upload failed.');
        }, 
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          const fileData: FileType = {
            id: doc(filesRef).id,
            name: file.name,
            type: 'file',
            path: currentPath,
            url: downloadURL
          };

          await addDoc(filesRef, fileData);
          showToastMessage('File uploaded successfully!');
        }
      );
    }

    setTimeout(() => {
      resetUploadState();
    }, 3000);
  };

  const handleCreateFolder = async () => {
    if (newFolderName) {
      const newFolder: FileType = {
        id: Date.now().toString(), // Generate a unique ID
        name: newFolderName,
        type: 'folder',
        path: currentPath,
      };

      const filesRef = collection(db, "files");
      await addDoc(filesRef, newFolder);

      setNewFolderName('');
      setShowNewFolderMenu(false);
      showToastMessage('Folder created successfully!');
    }
  };

  const showToastMessage = useCallback((message: string) => {
    setToastMessage(message)
    setShowToast(true)
    setTimeout(() => setShowToast(false), 3000) // Hide toast after 3 seconds
  }, [])

  const handleDownload = useCallback(async () => {
    if (!selectedFile) return;

    setIsDownloading(true);
    setDownloadProgress(0);

    try {
      const storage = getStorage();
      const fileRef = ref(storage, `${selectedFile.path}${selectedFile.name}`);
      const url = await getDownloadURL(fileRef);

      // Simulate download progress
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        setDownloadProgress(i);
      }

      // Open the download URL in a new tab
      window.open(url, '_blank');

      showToastMessage('File downloaded successfully!');
    } catch (error) {
      console.error("Download failed:", error);
      showToastMessage('File download failed.');
    } finally {
      setIsDownloading(false);
      setShowDownloadPopup(false);
      setDownloadProgress(0);
    }
  }, [selectedFile, showToastMessage]);

  const handleContextMenu = (event: React.MouseEvent, item: FileType) => {
    event.preventDefault();
    event.stopPropagation(); // Add this line to prevent immediate closing
    setContextMenu({ x: event.clientX, y: event.clientY, item });
  };

  const handleOpenItem = (item: FileType) => {
    if (item.type === 'folder') {
      setCurrentPath(prevPath => prevPath === '/' ? `/${item.name}/` : `${prevPath}${item.name}/`);
    } else {
      setSelectedFile(item);
      setShowDownloadPopup(true);
    }
    setContextMenu({ x: 0, y: 0, item: null });
  };

  const handleDeleteClick = (item: FileType) => {
    setItemToDelete(item);
    setShowDeleteConfirm(true);
    setContextMenu({ x: 0, y: 0, item: null });
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;

    try {
      // Delete from Firestore
      const filesRef = collection(db, "files");
      const q = query(filesRef, where("path", "==", itemToDelete.path), where("name", "==", itemToDelete.name));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const docToDelete = querySnapshot.docs[0];
        await deleteDoc(doc(db, "files", docToDelete.id));
      }

      // Delete from Storage if it's a file
      if (itemToDelete.type === 'file') {
        const storage = getStorage();
        const storageRef = ref(storage, `${itemToDelete.path}${itemToDelete.name}`);
        await deleteObject(storageRef);
      }

      showToastMessage(`${itemToDelete.name} deleted successfully!`);
      
      // Update local state to remove the deleted item
      setFiles(prevFiles => prevFiles.filter(file => file.id !== itemToDelete.id));
    } catch (error) {
      console.error("Delete failed:", error);
      showToastMessage(`Failed to delete ${itemToDelete.name}.`);
    } finally {
      setShowDeleteConfirm(false);
      setItemToDelete(null);
    }
  };

  useEffect(() => {
    setIsLoading(true) // Set loading to true when starting to fetch data
    const filesRef = collection(db, "files");
    const q = query(filesRef, where("path", "==", currentPath));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedFiles: FileType[] = [];
      querySnapshot.forEach((doc) => {
        fetchedFiles.push({ id: doc.id, ...doc.data() } as FileType);
      });
      setFiles(fetchedFiles);
      setIsLoading(false) // Set loading to false when data is fetched
    });

    // Cleanup function to unsubscribe from the listener when the component unmounts
    return () => unsubscribe();
  }, [currentPath]);

  // Add a function to get the current folder name
  const getCurrentFolderName = () => {
    const pathParts = currentPath.split('/').filter(Boolean);
    return pathParts.length > 0 ? pathParts[pathParts.length - 1] : 'My Drive';
  };

  // Add this new useEffect hook
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenu.item && !(event.target as Element).closest('.context-menu')) {
        setContextMenu({ x: 0, y: 0, item: null });
      }
    };

    document.addEventListener('click', handleClickOutside);

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [contextMenu]);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-8 transition-colors duration-200">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {currentPath !== '/' && (
              <Button variant="ghost" onClick={handleBack} className="mr-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            )}
            {getCurrentFolderName()}
          </h1>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              Name ▼
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            >
              {theme === "light" ? <MoonIcon /> : <SunIcon />}
            </Button>
            <Button variant="ghost" size="icon">
              ⋮
            </Button>
          </div>
        </header>

        <AnimatePresence>
          {isLoading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex justify-center items-center h-[calc(100vh-12rem)]"
            >
              <div className="w-16 h-16 border-4 border-blue-500 border-solid rounded-full animate-spin border-t-transparent"></div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <ScrollArea className="h-[calc(100vh-12rem)]">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {files.map((item) => (
                    <motion.div
                      key={item.id}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className="p-2"
                    >
                      <Card 
                        className="p-4 bg-white dark:bg-gray-800 cursor-pointer h-full flex flex-col items-center justify-center transition-colors duration-200 ease-in-out hover:bg-gray-50 dark:hover:bg-gray-700 select-none overflow-hidden"
                        onDoubleClick={(e) => handleDoubleClick(e, item)}
                        onContextMenu={(e) => handleContextMenu(e, item)}
                      >
                        {item.type === 'folder' ? (
                          <Folder className="h-10 w-10 text-yellow-400 mb-2" />
                        ) : (
                          getFileIcon(item.name)
                        )}
                        <p className="text-center text-sm truncate w-full">{item.name}</p>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="fixed bottom-8 right-8 space-x-4">
          <Button onClick={() => setShowUploadMenu(true)} className="bg-blue-500 hover:bg-blue-600 text-white">
            <Upload className="mr-2 h-4 w-4" />
            Upload
          </Button>
          <Button onClick={() => setShowNewFolderMenu(true)} className="bg-green-500 hover:bg-green-600 text-white">
            <Plus className="mr-2 h-4 w-4" />
            New Folder
          </Button>
        </div>

        <AnimatePresence>
          {showUploadMenu && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed bottom-24 right-8 bg-white p-6 rounded-lg shadow-lg w-80"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Upload File</h2>
                <Button variant="ghost" size="icon" onClick={() => {
                  setShowUploadMenu(false)
                  resetUploadState()
                }} className="text-gray-500 hover:text-gray-700">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {!isUploading ? (
                <>
                  <div 
                    className={`border-2 border-dashed rounded-lg p-4 text-center mb-4 transition-colors ${
                      dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                    }`}
                  >
                    <p className="text-gray-600 mb-2">Drag & drop files here</p>
                    <p className="text-gray-400 text-sm">or</p>
                    <Button 
                      onClick={() => fileInputRef.current?.click()} 
                      className="mt-2 bg-blue-500 hover:bg-blue-600 text-white"
                    >
                      Select Files
                    </Button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                      className="hidden"
                      multiple
                    />
                  </div>
                  <Button onClick={() => {
                    setShowUploadMenu(false)
                    resetUploadState()
                  }} className="bg-gray-200 hover:bg-gray-300 text-gray-800">Cancel</Button>
                </>
              ) : (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-1">Uploading...</p>
                  <Progress value={uploadProgress} className="w-full" />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showNewFolderMenu && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed bottom-24 right-8 bg-white p-6 rounded-lg shadow-lg w-80"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Create New Folder</h2>
                <Button variant="ghost" size="icon" onClick={() => setShowNewFolderMenu(false)} className="text-gray-500 hover:text-gray-700">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <Input
                type="text"
                placeholder="Folder Name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="mb-4"
              />
              <div className="flex justify-end space-x-2">
                <Button onClick={() => setShowNewFolderMenu(false)} className="bg-gray-200 hover:bg-gray-300 text-gray-800">
                  Cancel
                </Button>
                <Button onClick={handleCreateFolder} className="bg-green-500 hover:bg-green-600 text-white">
                  Create
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showDownloadPopup && selectedFile && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
            >
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-80">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Download File</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4">Do you want to download {selectedFile.name}?</p>
                {!isDownloading ? (
                  <div className="flex justify-end space-x-2">
                    <Button onClick={() => setShowDownloadPopup(false)} className="bg-gray-200 hover:bg-gray-300 text-gray-800">
                      Cancel
                    </Button>
                    <Button onClick={handleDownload} className="bg-blue-500 hover:bg-blue-600 text-white">
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                  </div>
                ) : (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Downloading...</p>
                    <Progress value={downloadProgress} className="w-full" />
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showToast && (
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              transition={{ duration: 0.3 }}
              className="fixed top-4 right-4 z-50"
            >
              <Toast
                variant="success"
                className="bg-green-500 text-white p-4 rounded-lg shadow-lg"
              >
                <Check className="h-5 w-5 mr-2" />
                {toastMessage}
              </Toast>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Context Menu */}
        {contextMenu.item && (
          <div
            className="fixed bg-white dark:bg-gray-800 shadow-md rounded-md py-2 z-50 context-menu"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            <button
              className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
              onClick={() => handleOpenItem(contextMenu.item!)}
            >
              <Eye className="mr-2 h-4 w-4" /> Open
            </button>
            <button
              className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center text-red-500"
              onClick={() => handleDeleteClick(contextMenu.item!)}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </button>
          </div>
        )}

        {/* Delete Confirmation Popup */}
        <AnimatePresence>
          {showDeleteConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            >
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-80">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Confirm Delete</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Are you sure you want to delete {itemToDelete?.name}?
                </p>
                <div className="flex justify-end space-x-2">
                  <Button onClick={() => setShowDeleteConfirm(false)} className="bg-gray-200 hover:bg-gray-300 text-gray-800">
                    Cancel
                  </Button>
                  <Button onClick={handleDeleteConfirm} className="bg-red-500 hover:bg-red-600 text-white">
                    Delete
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
