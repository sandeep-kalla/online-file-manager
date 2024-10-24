'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { X, Upload, FileText, Folder, Plus, Check } from "lucide-react"

type FileUpload = {
  name: string;
  progress: number;
  color: string;
}

type Folder = {
  id: string;
  name: string;
  files: FileUpload[];
}

export function AppLayoutComponent() {
  const [folders, setFolders] = useState<Folder[]>([
    { id: '1', name: 'Documents', files: [] },
    { id: '2', name: 'Images', files: [] },
  ])
  const [activeFolder, setActiveFolder] = useState<Folder | null>(null)
  const [newFolderName, setNewFolderName] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFiles = Array.from(e.dataTransfer.files)
    handleFiles(droppedFiles)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      handleFiles(selectedFiles)
    }
  }

  const handleFiles = (newFiles: File[]) => {
    if (!activeFolder) return

    const colors = ['bg-blue-500', 'bg-cyan-500', 'bg-pink-500']
    const newUploads = newFiles.map((file, index) => ({
      name: file.name,
      progress: 0,
      color: colors[index % colors.length]
    }))

    setFolders(prevFolders => {
      return prevFolders.map(folder => {
        if (folder.id === activeFolder.id) {
          return { ...folder, files: [...folder.files, ...newUploads] }
        }
        return folder
      })
    })

    // Simulate file upload progress
    newUploads.forEach((upload) => {
      const interval = setInterval(() => {
        setFolders(prevFolders => {
          const updatedFolders = prevFolders.map(folder => {
            if (folder.id === activeFolder.id) {
              const updatedFiles = folder.files.map(file => {
                if (file.name === upload.name) {
                  return { ...file, progress: Math.min(file.progress + 10, 100) }
                }
                return file
              })
              return { ...folder, files: updatedFiles }
            }
            return folder
          })

          if (updatedFolders.every(folder => 
            folder.files.every(file => file.progress === 100)
          )) {
            clearInterval(interval)
            setShowSuccess(true)
            setTimeout(() => setShowSuccess(false), 3000)
          }

          return updatedFolders
        })
      }, 500)
    })
  }

  const addNewFolder = () => {
    if (newFolderName.trim()) {
      const newFolder: Folder = {
        id: Date.now().toString(),
        name: newFolderName.trim(),
        files: []
      }
      setFolders([...folders, newFolder])
      setNewFolderName('')
    }
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-md">
        <div className="p-4">
          <h2 className="text-xl font-bold mb-4">Folders</h2>
          <div className="flex mb-4">
            <Input
              placeholder="New folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="mr-2"
            />
            <Button onClick={addNewFolder} size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <ScrollArea className="h-[calc(100vh-8rem)]">
            {folders.map((folder) => (
              <Button
                key={folder.id}
                variant={activeFolder?.id === folder.id ? "secondary" : "ghost"}
                className="w-full justify-start mb-2"
                onClick={() => setActiveFolder(folder)}
              >
                <Folder className="mr-2 h-4 w-4" />
                {folder.name}
              </Button>
            ))}
          </ScrollArea>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 p-8">
        <Card className="w-full max-w-2xl mx-auto">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-2xl font-bold">
              {activeFolder ? `Upload to ${activeFolder.name}` : 'Select a folder'}
            </CardTitle>
            <Button variant="ghost" size="icon">
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {activeFolder && (
              <>
                <motion.div
                  className={`border-2 border-dashed rounded-lg p-8 text-center mb-4 ${
                    isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600">Drag files to upload</p>
                  <p className="text-xs text-gray-500 mt-1">or</p>
                  <Button
                    variant="outline"
                    className="mt-2"
                    onClick={() => document.getElementById('fileInput')?.click()}
                  >
                    Browse Files
                  </Button>
                  <input
                    id="fileInput"
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileInput}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Max file size: 50MB
                  </p>
                  <p className="text-xs text-gray-500">
                    Supported file types: JPG, PNG, GIF, PDF, DOC
                  </p>
                </motion.div>
                <div className="space-y-2">
                  <AnimatePresence>
                    {activeFolder.files.map((file, index) => (
                      <motion.div
                        key={file.name}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                        className="flex items-center space-x-2"
                      >
                        <FileText className={`h-4 w-4 ${file.color.replace('bg-', 'text-')}`} />
                        <div className="flex-1">
                          <div className="text-sm font-medium">{file.name}</div>
                          <Progress value={file.progress} className={file.color} />
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Success animation */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed top-4 right-4 bg-green-500 text-white p-4 rounded-lg shadow-lg flex items-center"
          >
            <Check className="mr-2 h-5 w-5" />
            <span>Upload successful!</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}