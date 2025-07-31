import { useState } from 'react'
import html2canvas from 'html2canvas'

export default function InvoiceForm() {
  const [form, setForm] = useState({
    invoiceNo: '',
    invoiceDate: '',
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    discount: 0,
    deliveryFee: 0,
  })

  const [items, setItems] = useState([{ desc: '', qty: 1, price: 0 }])
  const [previewVisible, setPreviewVisible] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...items]
    updatedItems[index][field] = field === 'desc' ? value : parseFloat(value)
    setItems(updatedItems)
  }

  const addItem = () => setItems([...items, { desc: '', qty: 1, price: 0 }])

  const getSubTotal = () => items.reduce((sum, item) => sum + item.qty * item.price, 0)

  const handleDownload = () => {
    const element = document.getElementById('invoice-preview')
    html2canvas(element, { scale: 2 }).then((canvas) => {
      const link = document.createElement('a')
      link.download = `${form.invoiceNo}_mobile.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    })
  }

  return (
    <div className="max-w-4xl mx-auto bg-gray-900 text-white p-8 rounded-lg shadow-lg space-y-8">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-yellow-500">Invoice Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="invoiceNo" className="block text-sm font-medium text-gray-300">Invoice No</label>
            <input id="invoiceNo" name="invoiceNo" onChange={handleChange} className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm" />
          </div>
          <div>
            <label htmlFor="invoiceDate" className="block text-sm font-medium text-gray-300">Invoice Date</label>
            <input id="invoiceDate" type="date" name="invoiceDate" onChange={handleChange} className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm" />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-yellow-500">Client Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="clientName" className="block text-sm font-medium text-gray-300">Client Name</label>
            <input id="clientName" name="clientName" onChange={handleChange} className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm" />
          </div>
          <div>
            <label htmlFor="clientEmail" className="block text-sm font-medium text-gray-300">Client Email</label>
            <input id="clientEmail" name="clientEmail" onChange={handleChange} className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm" />
          </div>
          <div>
            <label htmlFor="clientPhone" className="block text-sm font-medium text-gray-300">Client Phone</label>
            <input id="clientPhone" name="clientPhone" onChange={handleChange} className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm" />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-yellow-500">Invoice Items</h2>
          <button onClick={addItem} className="bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-2 rounded-md font-semibold transition">+ Add Item</button>
        </div>
        {items.map((item, idx) => (
          <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300">Description</label>
              <input value={item.desc} onChange={(e) => handleItemChange(idx, 'desc', e.target.value)} className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300">Qty</label>
              <input type="number" value={item.qty} onChange={(e) => handleItemChange(idx, 'qty', e.target.value)} className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300">Price</label>
              <input type="number" value={item.price} onChange={(e) => handleItemChange(idx, 'price', e.target.value)} className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="discount" className="block text-sm font-medium text-gray-300">Discount %</label>
          <input name="discount" id="discount" type="number" onChange={handleChange} className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm" />
        </div>
        <div>
          <label htmlFor="deliveryFee" className="block text-sm font-medium text-gray-300">Delivery Fee (LKR)</label>
          <input name="deliveryFee" id="deliveryFee" type="number" onChange={handleChange} className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm" />
        </div>
      </div>

      <div className="pt-6">
        <button
          onClick={() => setPreviewVisible(true)}
          className="bg-yellow-500 hover:bg-yellow-400 text-black px-6 py-2 rounded-md font-bold"
        >
          Generate Preview
        </button>
      </div>

      {previewVisible && (
        <div className="mt-8">
          <div id="invoice-preview" className="bg-white text-black p-6 rounded-lg shadow-lg">
            <h3 className="text-2xl font-bold text-yellow-600 mb-2">Invoice</h3>
            <p>Invoice #: {form.invoiceNo}</p>
            <p>Date: {form.invoiceDate}</p>
            <p>To: {form.clientName}, {form.clientEmail}, {form.clientPhone}</p>
            <hr className="my-4" />
            <table className="w-full text-sm border border-gray-300">
              <thead className="bg-yellow-400 text-black">
                <tr>
                  <th className="border p-2">Description</th>
                  <th className="border p-2">Qty</th>
                  <th className="border p-2">Price</th>
                  <th className="border p-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i}>
                    <td className="border p-2">{item.desc}</td>
                    <td className="border p-2">{item.qty}</td>
                    <td className="border p-2">{item.price.toFixed(2)}</td>
                    <td className="border p-2">{(item.qty * item.price).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-right mt-4 space-y-1">
              <p>Sub-total: LKR {getSubTotal().toFixed(2)}</p>
              <p>Discount ({form.discount}%): -LKR {(getSubTotal() * (form.discount / 100)).toFixed(2)}</p>
              <p>Delivery Fee: LKR {parseFloat(form.deliveryFee || 0).toFixed(2)}</p>
              <p className="text-lg font-bold">Total: LKR {(getSubTotal() - (getSubTotal() * (form.discount / 100)) + parseFloat(form.deliveryFee || 0)).toFixed(2)}</p>
            </div>
          </div>
          <button onClick={handleDownload} className="mt-4 bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-2 rounded-md font-semibold">
            Download PNG
          </button>
        </div>
      )}
    </div>
  )
}
