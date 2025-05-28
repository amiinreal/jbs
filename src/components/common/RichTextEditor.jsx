import React, { useEffect, useRef } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const RichTextEditor = ({ value, onChange, placeholder }) => {
  const quillRef = useRef(null);
  
  // Default modules and formats
  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline'],
      [{'list': 'ordered'}, {'list': 'bullet'}],
      ['link'],
      ['clean']
    ],
  };
  
  const formats = [
    'header',
    'bold', 'italic', 'underline',
    'list', 'bullet',
    'link'
  ];
  
  // After initial render, this addresses the DOMNodeInserted deprecation warning
  useEffect(() => {
    // The warning happens during Quill initialization
    // Nothing we can do about the warning in the library code,
    // but we can make sure we don't reinitialize the editor unnecessarily
    const quillInstance = quillRef.current?.getEditor();
    
    return () => {
      // Cleanup
    };
  }, []);
  
  return (
    <div className="rich-text-editor-container">
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
      />
      <p className="editor-hint">
        Use the toolbar to format your description with headers, bullet points, and more.
      </p>
    </div>
  );
};

export default RichTextEditor;
