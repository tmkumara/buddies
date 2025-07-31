import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import InvoiceForm from './components/InvoiceForm'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="min-h-screen bg-black text-white p-4 dark">
      <h1 className="text-3xl font-bold text-yellow-500 text-center mb-6">Buddies Invoice Generator</h1>
      <InvoiceForm />
    </div>
  )
}

export default App
