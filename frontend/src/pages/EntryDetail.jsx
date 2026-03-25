import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getEntry } from '../api/client.js'

export default function EntryDetail() {
  const { entryId } = useParams()
  const navigate = useNavigate()
  const [entry, setEntry] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getEntry(entryId)
      .then(data => { setEntry(data); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [entryId])

  if (loading) return <div className="loading-center"><div className="spinner" /></div>
  if (error) return <div className="alert alert-error">{error}</div>
  if (!entry) return null

  return (
    <div>
      <div className="breadcrumb">
        <span onClick={() => navigate(-1)}>返回</span>
      </div>

      <div className="page-header">
        <div>
          <h1 className="page-title">📄 数据记录详情</h1>
          <div style={{fontSize:'.85rem', color:'#777', marginTop:'.25rem'}}>
            录入人：{entry.submitted_by} ·
            录入时间：{entry.submitted_at?.slice(0,16).replace('T',' ')} ·
            <span className={`tag ${entry.status === 'submitted' ? 'tag-green' : 'tag-orange'}`}
              style={{marginLeft:'.5rem'}}>
              {entry.status === 'submitted' ? '已提交' : '草稿'}
            </span>
          </div>
        </div>
      </div>

      <div className="card" style={{maxWidth:'680px'}}>
        {entry.values?.length === 0 && (
          <p style={{color:'#777'}}>该记录没有字段值</p>
        )}
        {entry.values?.map(v => (
          <div key={v.value_id} style={{marginBottom:'1rem', paddingBottom:'1rem', borderBottom:'1px solid #e2e8f0'}}>
            <div style={{fontSize:'.8rem', color:'#777', marginBottom:'.25rem'}}>
              {v.field_label}
              <span className="field-type-badge" style={{marginLeft:'.5rem'}}>{v.field_type}</span>
            </div>
            <div style={{fontWeight:'500'}}>
              {v.field_value
                ? (v.field_type === 'checkbox'
                    ? JSON.parse(v.field_value).join('，')
                    : v.field_value)
                : <span style={{color:'#aaa'}}>—</span>
              }
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
