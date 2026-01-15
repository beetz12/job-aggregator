'use client'

import { useState, useEffect } from 'react'
import { JobCriteria } from '@/lib/types'
import {
  Briefcase,
  DollarSign,
  MapPin,
  Users,
  Code,
  Download,
  Edit3,
  Save,
  FileCheck,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'

interface JobCriteriaDocumentProps {
  criteria: JobCriteria
  onEdit: (section: string) => void
  onContinue: () => void
  editable?: boolean
  onUpdate?: (updatedCriteria: JobCriteria) => void
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// Inline Input Component for edit mode
function InlineInput({
  label,
  value,
  onChange,
  className = '',
  type = 'text',
}: {
  label?: string
  value: string | number
  onChange: (value: string) => void
  className?: string
  type?: 'text' | 'number'
}) {
  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          {label}
        </label>
      )}
      <input
        type={type}
        className="w-full p-2 border-2 border-gray-600 rounded bg-gray-700 text-white font-medium focus:border-indigo-500 outline-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

// Inline Textarea Component for edit mode
function InlineTextArea({
  label,
  value,
  onChange,
}: {
  label?: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          {label}
        </label>
      )}
      <textarea
        className="w-full p-3 border-2 border-gray-600 rounded bg-gray-700 text-white font-medium focus:border-indigo-500 outline-none min-h-[100px]"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

// Inline Select Component for edit mode
function InlineSelect({
  label,
  value,
  options,
  onChange,
}: {
  label?: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          {label}
        </label>
      )}
      <select
        className="w-full p-2 border-2 border-gray-600 rounded bg-gray-700 text-white font-medium focus:border-indigo-500 outline-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function SectionHeader({
  title,
  section,
  editable,
  isEditing,
  onEdit,
  icon: Icon,
  collapsed,
  onToggleCollapse,
}: {
  title: string
  section: string
  editable?: boolean
  isEditing: boolean
  onEdit: (section: string) => void
  icon?: React.ComponentType<{ className?: string; size?: number }>
  collapsed?: boolean
  onToggleCollapse?: () => void
}) {
  return (
    <div className="flex items-center justify-between border-b border-gray-700 pb-2 mb-4">
      <div className="flex items-center gap-2">
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="text-gray-400 hover:text-white transition-colors"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
          </button>
        )}
        {Icon && <Icon className="text-indigo-400" size={20} />}
        <h3 className="text-lg font-semibold text-white">{title}</h3>
      </div>
      {editable && !isEditing && (
        <button
          onClick={() => onEdit(section)}
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-indigo-400 transition-colors"
          aria-label={`Edit ${title}`}
        >
          <Edit3 size={16} />
          <span>Edit</span>
        </button>
      )}
    </div>
  )
}

function Badge({
  children,
  variant = 'default',
  onRemove,
  isEditing,
}: {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'info' | 'warning' | 'danger'
  onRemove?: () => void
  isEditing?: boolean
}) {
  const variantClasses = {
    default: 'bg-gray-700 text-gray-300',
    success: 'bg-green-900/50 text-green-400',
    info: 'bg-blue-900/50 text-blue-400',
    warning: 'bg-yellow-900/50 text-yellow-400',
    danger: 'bg-red-900/50 text-red-400',
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variantClasses[variant]} ${isEditing ? 'pr-1' : ''}`}
    >
      {children}
      {isEditing && onRemove && (
        <button
          onClick={onRemove}
          className="ml-1 p-0.5 hover:bg-gray-600 rounded-full transition-colors"
        >
          <Trash2 size={12} />
        </button>
      )}
    </span>
  )
}

function AddButton({ onClick, label }: { onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 px-2 py-1 border border-dashed border-gray-500 rounded-full text-xs text-gray-400 hover:text-indigo-400 hover:border-indigo-400 transition-colors"
    >
      <Plus size={12} />
      {label && <span>{label}</span>}
    </button>
  )
}

function getRemoteBadgeVariant(
  remote: 'required' | 'preferred' | 'flexible'
): 'success' | 'info' | 'default' {
  switch (remote) {
    case 'required':
      return 'success'
    case 'preferred':
      return 'info'
    default:
      return 'default'
  }
}

function getRemoteLabel(remote: 'required' | 'preferred' | 'flexible'): string {
  switch (remote) {
    case 'required':
      return 'Remote Required'
    case 'preferred':
      return 'Remote Preferred'
    default:
      return 'Flexible (Remote/Hybrid/Onsite)'
  }
}

export default function JobCriteriaDocument({
  criteria,
  onEdit,
  onContinue,
  editable = true,
  onUpdate,
}: JobCriteriaDocumentProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState<JobCriteria>({ ...criteria })
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({})

  // Sync draft if criteria changes externally
  useEffect(() => {
    setDraft({ ...criteria })
  }, [criteria])

  const handlePrint = () => {
    window.print()
  }

  const toggleEdit = () => {
    if (isEditing && onUpdate) {
      onUpdate(draft)
    }
    setIsEditing(!isEditing)
  }

  const toggleSection = (section: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  // Helper function to update nested fields using dot notation
  const updateField = (path: string, value: unknown) => {
    const newDraft = { ...draft }
    const parts = path.split('.')
    let current: Record<string, unknown> = newDraft as Record<string, unknown>

    for (let i = 0; i < parts.length - 1; i++) {
      current = current[parts[i]] as Record<string, unknown>
    }
    current[parts[parts.length - 1]] = value
    setDraft(newDraft)
  }

  // Helper function to add item to an array
  const addToArray = (path: string, defaultValue: unknown = '') => {
    const parts = path.split('.')
    const newDraft = { ...draft }
    let current: Record<string, unknown> = newDraft as Record<string, unknown>

    for (let i = 0; i < parts.length; i++) {
      current = current[parts[i]] as Record<string, unknown>
    }
    ;(current as unknown as unknown[]).push(defaultValue)
    setDraft(newDraft)
  }

  // Helper function to remove item from an array
  const removeFromArray = (path: string, index: number) => {
    const parts = path.split('.')
    const newDraft = { ...draft }
    let current: Record<string, unknown> = newDraft as Record<string, unknown>

    for (let i = 0; i < parts.length; i++) {
      current = current[parts[i]] as Record<string, unknown>
    }
    ;(current as unknown as unknown[]).splice(index, 1)
    setDraft(newDraft)
  }

  // Helper function to update item in an array
  const updateArrayItem = (path: string, index: number, value: string) => {
    const parts = path.split('.')
    const newDraft = { ...draft }
    let current: Record<string, unknown> = newDraft as Record<string, unknown>

    for (let i = 0; i < parts.length; i++) {
      current = current[parts[i]] as Record<string, unknown>
    }
    ;(current as unknown as string[])[index] = value
    setDraft(newDraft)
  }

  return (
    <div className="bg-gray-900 rounded-xl p-6 max-w-4xl mx-auto">
      {/* Document Header with Edit/Print Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 pb-6 border-b border-gray-700 print:hidden">
        <div>
          {isEditing ? (
            <InlineInput
              value={draft.name}
              onChange={(val) => updateField('name', val)}
              className="text-xl"
            />
          ) : (
            <>
              <h1 className="text-2xl font-bold text-white mb-1">Job Search Criteria</h1>
              <p className="text-lg text-gray-400">{draft.name}</p>
            </>
          )}
          <p className="text-sm text-gray-500 mt-2">
            Last Updated: {formatDate(draft.lastUpdated)}
          </p>
        </div>
        {editable && (
          <div className="flex gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-800 text-gray-300 transition-colors bg-gray-800 shadow-sm font-medium"
            >
              <Download size={18} /> Export PDF
            </button>
            <button
              onClick={toggleEdit}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors shadow-md font-medium ${
                isEditing
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              {isEditing ? (
                <>
                  <Save size={18} /> Save Changes
                </>
              ) : (
                <>
                  <Edit3 size={18} /> Edit Document
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Print Header - only shows when printing */}
      <div className="hidden print:block text-center mb-8 pb-6 border-b border-gray-700">
        <h1 className="text-2xl font-bold text-white mb-1">Job Search Criteria</h1>
        <p className="text-lg text-gray-400">{draft.name}</p>
        <p className="text-sm text-gray-500 mt-2">
          Last Updated: {formatDate(draft.lastUpdated)}
        </p>
      </div>

      {/* Executive Summary */}
      <div className="bg-gray-800 rounded-lg p-5 mb-6">
        <SectionHeader
          title="Executive Summary"
          section="summary"
          editable={editable}
          isEditing={isEditing}
          onEdit={onEdit}
          icon={FileCheck}
          collapsed={collapsedSections['summary']}
          onToggleCollapse={() => toggleSection('summary')}
        />
        {!collapsedSections['summary'] && (
          <>
            {isEditing ? (
              <InlineTextArea
                value={draft.executiveSummary}
                onChange={(val) => updateField('executiveSummary', val)}
              />
            ) : (
              <p className="text-gray-300 leading-relaxed italic border-l-4 border-indigo-600 pl-4 py-1">
                &ldquo;{draft.executiveSummary}&rdquo;
              </p>
            )}
          </>
        )}
      </div>

      {/* Compensation Requirements */}
      <div className="bg-gray-800 rounded-lg p-5 mb-6">
        <SectionHeader
          title="Compensation Requirements"
          section="compensation"
          editable={editable}
          isEditing={isEditing}
          onEdit={onEdit}
          icon={DollarSign}
          collapsed={collapsedSections['compensation']}
          onToggleCollapse={() => toggleSection('compensation')}
        />
        {!collapsedSections['compensation'] && (
          <>
            {isEditing ? (
              <div className="grid grid-cols-2 gap-6">
                <InlineInput
                  label="Salary Floor"
                  type="number"
                  value={draft.compensation.floor}
                  onChange={(val) => updateField('compensation.floor', parseInt(val) || 0)}
                />
                <InlineInput
                  label="Target Salary"
                  type="number"
                  value={draft.compensation.target}
                  onChange={(val) => updateField('compensation.target', parseInt(val) || 0)}
                />
                <InlineSelect
                  label="Currency"
                  value={draft.compensation.currency}
                  options={[
                    { value: 'USD', label: 'USD' },
                    { value: 'EUR', label: 'EUR' },
                    { value: 'GBP', label: 'GBP' },
                    { value: 'CAD', label: 'CAD' },
                  ]}
                  onChange={(val) => updateField('compensation.currency', val)}
                />
                <InlineSelect
                  label="Equity Required"
                  value={draft.compensation.equity ? 'yes' : 'no'}
                  options={[
                    { value: 'yes', label: 'Yes' },
                    { value: 'no', label: 'No' },
                  ]}
                  onChange={(val) => updateField('compensation.equity', val === 'yes')}
                />
                {draft.compensation.equity && (
                  <InlineSelect
                    label="Equity Importance"
                    value={draft.compensation.equityImportance || 'nice-to-have'}
                    options={[
                      { value: 'critical', label: 'Critical' },
                      { value: 'important', label: 'Important' },
                      { value: 'nice-to-have', label: 'Nice to Have' },
                    ]}
                    onChange={(val) =>
                      updateField(
                        'compensation.equityImportance',
                        val as 'critical' | 'important' | 'nice-to-have'
                      )
                    }
                  />
                )}
                <div className="col-span-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
                    Key Benefits
                  </label>
                  <div className="flex flex-wrap gap-2 items-center">
                    {(draft.compensation.benefits || []).map((benefit, i) => (
                      <div key={i} className="flex items-center gap-1 bg-gray-700 rounded-full px-2 py-1">
                        <input
                          className="bg-transparent border-none outline-none text-gray-300 text-sm w-24"
                          value={benefit}
                          onChange={(e) => updateArrayItem('compensation.benefits', i, e.target.value)}
                        />
                        <button
                          onClick={() => removeFromArray('compensation.benefits', i)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                    <AddButton
                      onClick={() => {
                        if (!draft.compensation.benefits) {
                          updateField('compensation.benefits', [''])
                        } else {
                          addToArray('compensation.benefits', '')
                        }
                      }}
                      label="Add"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="mb-4">
                    <p className="text-sm text-gray-500 mb-1">Salary Range</p>
                    <p className="text-xl font-semibold text-white">
                      {formatCurrency(draft.compensation.floor, draft.compensation.currency)} -{' '}
                      {formatCurrency(draft.compensation.target, draft.compensation.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Minimum (Floor)</p>
                    <p className="text-gray-300">
                      {formatCurrency(draft.compensation.floor, draft.compensation.currency)}
                    </p>
                  </div>
                </div>
                <div>
                  <div className="mb-4">
                    <p className="text-sm text-gray-500 mb-1">Equity</p>
                    <div className="flex items-center gap-2">
                      <Badge variant={draft.compensation.equity ? 'success' : 'default'}>
                        {draft.compensation.equity ? 'Yes' : 'No'}
                      </Badge>
                      {draft.compensation.equity && draft.compensation.equityImportance && (
                        <span className="text-sm text-gray-400 capitalize">
                          ({draft.compensation.equityImportance.replace('-', ' ')})
                        </span>
                      )}
                    </div>
                  </div>
                  {draft.compensation.benefits && draft.compensation.benefits.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-500 mb-2">Key Benefits</p>
                      <div className="flex flex-wrap gap-1">
                        {draft.compensation.benefits.map((benefit, i) => (
                          <Badge key={i}>{benefit}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Location Preferences */}
      <div className="bg-gray-800 rounded-lg p-5 mb-6">
        <SectionHeader
          title="Location Preferences"
          section="location"
          editable={editable}
          isEditing={isEditing}
          onEdit={onEdit}
          icon={MapPin}
          collapsed={collapsedSections['location']}
          onToggleCollapse={() => toggleSection('location')}
        />
        {!collapsedSections['location'] && (
          <>
            {isEditing ? (
              <div className="space-y-4">
                <InlineSelect
                  label="Remote Preference"
                  value={draft.location.remote}
                  options={[
                    { value: 'required', label: 'Remote Required' },
                    { value: 'preferred', label: 'Remote Preferred' },
                    { value: 'flexible', label: 'Flexible' },
                  ]}
                  onChange={(val) =>
                    updateField('location.remote', val as 'required' | 'preferred' | 'flexible')
                  }
                />
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
                    Preferred Locations
                  </label>
                  <div className="flex flex-wrap gap-2 items-center">
                    {(draft.location.preferredLocations || []).map((loc, i) => (
                      <div key={i} className="flex items-center gap-1 bg-gray-700 rounded-full px-2 py-1">
                        <input
                          className="bg-transparent border-none outline-none text-gray-300 text-sm w-28"
                          value={loc}
                          onChange={(e) =>
                            updateArrayItem('location.preferredLocations', i, e.target.value)
                          }
                        />
                        <button
                          onClick={() => removeFromArray('location.preferredLocations', i)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                    <AddButton
                      onClick={() => {
                        if (!draft.location.preferredLocations) {
                          updateField('location.preferredLocations', [''])
                        } else {
                          addToArray('location.preferredLocations', '')
                        }
                      }}
                      label="Add"
                    />
                  </div>
                </div>
                <InlineInput
                  label="Timezone Preference"
                  value={draft.location.timezonePreference || ''}
                  onChange={(val) => updateField('location.timezonePreference', val)}
                />
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
                    Geo Restrictions
                  </label>
                  <div className="flex flex-wrap gap-2 items-center">
                    {(draft.location.geoRestrictions || []).map((restriction, i) => (
                      <div key={i} className="flex items-center gap-1 bg-yellow-900/50 rounded-full px-2 py-1">
                        <input
                          className="bg-transparent border-none outline-none text-yellow-400 text-sm w-28"
                          value={restriction}
                          onChange={(e) =>
                            updateArrayItem('location.geoRestrictions', i, e.target.value)
                          }
                        />
                        <button
                          onClick={() => removeFromArray('location.geoRestrictions', i)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                    <AddButton
                      onClick={() => {
                        if (!draft.location.geoRestrictions) {
                          updateField('location.geoRestrictions', [''])
                        } else {
                          addToArray('location.geoRestrictions', '')
                        }
                      }}
                      label="Add"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <Badge variant={getRemoteBadgeVariant(draft.location.remote)}>
                    {getRemoteLabel(draft.location.remote)}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  {draft.location.preferredLocations &&
                    draft.location.preferredLocations.length > 0 && (
                      <div>
                        <p className="text-sm text-gray-500 mb-2">Preferred Locations</p>
                        <ul className="space-y-1">
                          {draft.location.preferredLocations.map((location, i) => (
                            <li key={i} className="text-gray-300 flex items-center gap-2">
                              <MapPin size={16} className="text-blue-400" />
                              {location}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  {draft.location.timezonePreference && (
                    <div>
                      <p className="text-sm text-gray-500 mb-2">Timezone Preference</p>
                      <p className="text-gray-300">{draft.location.timezonePreference}</p>
                    </div>
                  )}
                </div>
                {draft.location.geoRestrictions && draft.location.geoRestrictions.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <p className="text-sm text-gray-500 mb-2">Geo Restrictions</p>
                    <div className="flex flex-wrap gap-1">
                      {draft.location.geoRestrictions.map((restriction, i) => (
                        <Badge key={i} variant="warning">
                          {restriction}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Culture & Values */}
      <div className="bg-gray-800 rounded-lg p-5 mb-6">
        <SectionHeader
          title="Culture & Values"
          section="culture"
          editable={editable}
          isEditing={isEditing}
          onEdit={onEdit}
          icon={Users}
          collapsed={collapsedSections['culture']}
          onToggleCollapse={() => toggleSection('culture')}
        />
        {!collapsedSections['culture'] && (
          <>
            {isEditing ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  {/* Values Column */}
                  <div>
                    <div className="flex justify-between items-center mb-4 border-b border-green-900 pb-2">
                      <h4 className="font-bold text-green-400 text-sm uppercase tracking-widest">
                        Core Values (Green Flags)
                      </h4>
                      <button
                        onClick={() => addToArray('culture.values', '')}
                        className="text-green-400 hover:text-green-300"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    <ul className="space-y-2">
                      {draft.culture.values.map((value, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <span className="text-green-400 shrink-0">+</span>
                          <input
                            className="flex-1 bg-transparent border-b border-gray-600 outline-none text-gray-300 focus:border-indigo-500"
                            value={value}
                            onChange={(e) => updateArrayItem('culture.values', i, e.target.value)}
                          />
                          <button
                            onClick={() => removeFromArray('culture.values', i)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 size={14} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Red Flags Column */}
                  <div>
                    <div className="flex justify-between items-center mb-4 border-b border-red-900 pb-2">
                      <h4 className="font-bold text-red-400 text-sm uppercase tracking-widest">
                        Red Flags
                      </h4>
                      <button
                        onClick={() => addToArray('culture.redFlags', '')}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    <ul className="space-y-2">
                      {draft.culture.redFlags.map((flag, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <span className="text-red-400 shrink-0">-</span>
                          <input
                            className="flex-1 bg-transparent border-b border-gray-600 outline-none text-gray-300 focus:border-indigo-500"
                            value={flag}
                            onChange={(e) => updateArrayItem('culture.redFlags', i, e.target.value)}
                          />
                          <button
                            onClick={() => removeFromArray('culture.redFlags', i)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 size={14} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Additional Culture Settings */}
                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-700">
                  <InlineSelect
                    label="Work Style"
                    value={draft.culture.workStyle || 'hybrid'}
                    options={[
                      { value: 'async', label: 'Async-first' },
                      { value: 'sync', label: 'Synchronous' },
                      { value: 'hybrid', label: 'Hybrid' },
                    ]}
                    onChange={(val) =>
                      updateField('culture.workStyle', val as 'async' | 'sync' | 'hybrid')
                    }
                  />
                  <InlineSelect
                    label="Team Size"
                    value={draft.culture.teamSize || 'any'}
                    options={[
                      { value: 'small', label: 'Small (<10)' },
                      { value: 'medium', label: 'Medium (10-50)' },
                      { value: 'large', label: 'Large (50+)' },
                      { value: 'any', label: 'Any Size' },
                    ]}
                    onChange={(val) =>
                      updateField('culture.teamSize', val as 'small' | 'medium' | 'large' | 'any')
                    }
                  />
                  <InlineInput
                    label="Leadership Style"
                    value={draft.culture.leadershipStyle || ''}
                    onChange={(val) => updateField('culture.leadershipStyle', val)}
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-6">
                  {/* Values Column */}
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Core Values</p>
                    <ul className="space-y-2">
                      {draft.culture.values.map((value, i) => (
                        <li key={i} className="text-gray-300 flex items-start gap-2">
                          <span className="text-green-400 mt-0.5">+</span>
                          {value}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Red Flags Column */}
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Red Flags</p>
                    <ul className="space-y-2">
                      {draft.culture.redFlags.map((flag, i) => (
                        <li key={i} className="text-gray-300 flex items-start gap-2">
                          <span className="text-red-400 mt-0.5">-</span>
                          {flag}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Additional Culture Preferences */}
                <div className="mt-4 pt-4 border-t border-gray-700 flex flex-wrap gap-4">
                  {draft.culture.workStyle && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Work Style</p>
                      <Badge variant="info">
                        {draft.culture.workStyle === 'async'
                          ? 'Async-first'
                          : draft.culture.workStyle === 'sync'
                            ? 'Synchronous'
                            : 'Hybrid'}
                      </Badge>
                    </div>
                  )}
                  {draft.culture.teamSize && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Team Size</p>
                      <Badge>
                        {draft.culture.teamSize === 'small'
                          ? 'Small Team (<10)'
                          : draft.culture.teamSize === 'medium'
                            ? 'Medium Team (10-50)'
                            : draft.culture.teamSize === 'large'
                              ? 'Large Team (50+)'
                              : 'Any Size'}
                      </Badge>
                    </div>
                  )}
                  {draft.culture.leadershipStyle && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Leadership Style</p>
                      <p className="text-gray-300">{draft.culture.leadershipStyle}</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Technical Requirements */}
      <div className="bg-gray-800 rounded-lg p-5 mb-6">
        <SectionHeader
          title="Technical Requirements"
          section="technical"
          editable={editable}
          isEditing={isEditing}
          onEdit={onEdit}
          icon={Code}
          collapsed={collapsedSections['technical']}
          onToggleCollapse={() => toggleSection('technical')}
        />
        {!collapsedSections['technical'] && (
          <>
            {isEditing ? (
              <div className="space-y-6">
                {/* Must Have */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Must Have
                    </label>
                    <button
                      onClick={() => addToArray('technicalStack.mustHave', '')}
                      className="text-green-400 hover:text-green-300"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {draft.technicalStack.mustHave.map((tech, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-1 bg-green-900/50 rounded-full px-3 py-1"
                      >
                        <input
                          className="bg-transparent border-none outline-none text-green-400 text-sm w-20"
                          value={tech}
                          onChange={(e) =>
                            updateArrayItem('technicalStack.mustHave', i, e.target.value)
                          }
                        />
                        <button
                          onClick={() => removeFromArray('technicalStack.mustHave', i)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Nice to Have */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Nice to Have
                    </label>
                    <button
                      onClick={() => addToArray('technicalStack.niceToHave', '')}
                      className="text-blue-400 hover:text-blue-300"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {draft.technicalStack.niceToHave.map((tech, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-1 bg-blue-900/50 rounded-full px-3 py-1"
                      >
                        <input
                          className="bg-transparent border-none outline-none text-blue-400 text-sm w-20"
                          value={tech}
                          onChange={(e) =>
                            updateArrayItem('technicalStack.niceToHave', i, e.target.value)
                          }
                        />
                        <button
                          onClick={() => removeFromArray('technicalStack.niceToHave', i)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Avoid */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Prefer to Avoid
                    </label>
                    <button
                      onClick={() => {
                        if (!draft.technicalStack.avoid) {
                          updateField('technicalStack.avoid', [''])
                        } else {
                          addToArray('technicalStack.avoid', '')
                        }
                      }}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(draft.technicalStack.avoid || []).map((tech, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-1 bg-red-900/50 rounded-full px-3 py-1"
                      >
                        <input
                          className="bg-transparent border-none outline-none text-red-400 text-sm w-20"
                          value={tech}
                          onChange={(e) =>
                            updateArrayItem('technicalStack.avoid', i, e.target.value)
                          }
                        />
                        <button
                          onClick={() => removeFromArray('technicalStack.avoid', i)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Domains */}
                <div className="pt-4 border-t border-gray-700">
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Preferred Domains
                    </label>
                    <button
                      onClick={() => {
                        if (!draft.technicalStack.domains) {
                          updateField('technicalStack.domains', [''])
                        } else {
                          addToArray('technicalStack.domains', '')
                        }
                      }}
                      className="text-gray-400 hover:text-gray-300"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(draft.technicalStack.domains || []).map((domain, i) => (
                      <div key={i} className="flex items-center gap-1 bg-gray-700 rounded-full px-3 py-1">
                        <input
                          className="bg-transparent border-none outline-none text-gray-300 text-sm w-24"
                          value={domain}
                          onChange={(e) =>
                            updateArrayItem('technicalStack.domains', i, e.target.value)
                          }
                        />
                        <button
                          onClick={() => removeFromArray('technicalStack.domains', i)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Must Have */}
                {draft.technicalStack.mustHave.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Must Have</p>
                    <div className="flex flex-wrap gap-2">
                      {draft.technicalStack.mustHave.map((tech, i) => (
                        <Badge key={i} variant="success">
                          {tech}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Nice to Have */}
                {draft.technicalStack.niceToHave.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Nice to Have</p>
                    <div className="flex flex-wrap gap-2">
                      {draft.technicalStack.niceToHave.map((tech, i) => (
                        <Badge key={i} variant="info">
                          {tech}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Avoid */}
                {draft.technicalStack.avoid && draft.technicalStack.avoid.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Prefer to Avoid</p>
                    <div className="flex flex-wrap gap-2">
                      {draft.technicalStack.avoid.map((tech, i) => (
                        <Badge key={i} variant="danger">
                          {tech}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Domains */}
                {draft.technicalStack.domains && draft.technicalStack.domains.length > 0 && (
                  <div className="pt-4 border-t border-gray-700">
                    <p className="text-sm text-gray-500 mb-2">Preferred Domains</p>
                    <div className="flex flex-wrap gap-2">
                      {draft.technicalStack.domains.map((domain, i) => (
                        <Badge key={i}>{domain}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Target Positions */}
      <div className="bg-gray-800 rounded-lg p-5 mb-6">
        <SectionHeader
          title="Target Positions"
          section="positions"
          editable={editable}
          isEditing={isEditing}
          onEdit={onEdit}
          icon={Briefcase}
          collapsed={collapsedSections['positions']}
          onToggleCollapse={() => toggleSection('positions')}
        />
        {!collapsedSections['positions'] && (
          <>
            {isEditing ? (
              <div className="space-y-4">
                <InlineSelect
                  label="Company Stage"
                  value={draft.companyStage}
                  options={[
                    { value: 'startup', label: 'Startup (Seed - Series A)' },
                    { value: 'growth', label: 'Growth (Series B+)' },
                    { value: 'enterprise', label: 'Enterprise' },
                    { value: 'any', label: 'Any Stage' },
                  ]}
                  onChange={(val) =>
                    updateField('companyStage', val as 'startup' | 'growth' | 'enterprise' | 'any')
                  }
                />
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Target Roles
                    </label>
                    <button
                      onClick={() => addToArray('targetPositions', '')}
                      className="text-indigo-400 hover:text-indigo-300"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  <ul className="space-y-2">
                    {draft.targetPositions.map((position, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <Briefcase size={16} className="text-blue-400 shrink-0" />
                        <input
                          className="flex-1 bg-gray-700/50 px-3 py-2 rounded border-none outline-none text-gray-300 focus:ring-2 focus:ring-indigo-500"
                          value={position}
                          onChange={(e) => updateArrayItem('targetPositions', i, e.target.value)}
                        />
                        <button
                          onClick={() => removeFromArray('targetPositions', i)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 size={16} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Company Stage</p>
                    <Badge variant="info">
                      {draft.companyStage === 'startup'
                        ? 'Startup (Seed - Series A)'
                        : draft.companyStage === 'growth'
                          ? 'Growth (Series B+)'
                          : draft.companyStage === 'enterprise'
                            ? 'Enterprise'
                            : 'Any Stage'}
                    </Badge>
                  </div>
                </div>
                {draft.targetPositions.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Target Roles</p>
                    <ul className="grid grid-cols-2 gap-2">
                      {draft.targetPositions.map((position, i) => (
                        <li
                          key={i}
                          className="text-gray-300 bg-gray-700/50 px-3 py-2 rounded flex items-center gap-2"
                        >
                          <Briefcase size={16} className="text-blue-400" />
                          {position}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Continue Button */}
      <div className="flex justify-center pt-4 print:hidden">
        <button
          onClick={onContinue}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors flex items-center gap-2"
        >
          <span>Continue to Job Matching</span>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 7l5 5m0 0l-5 5m5-5H6"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}
