'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useMyProfile, useCreateProfile, useUpdateProfile } from '@/hooks/useProfile'
import {
  SeniorityLevel,
  RemotePreference,
  CreateProfileInput,
} from '@/lib/types'

const seniorityLevels: { value: SeniorityLevel; label: string }[] = [
  { value: 'junior', label: 'Junior (0-2 years)' },
  { value: 'mid', label: 'Mid-Level (2-5 years)' },
  { value: 'senior', label: 'Senior (5-8 years)' },
  { value: 'lead', label: 'Lead (8+ years)' },
]

const remotePreferences: { value: RemotePreference; label: string }[] = [
  { value: 'remote-only', label: 'Remote Only' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'onsite', label: 'On-site Only' },
  { value: 'flexible', label: 'Flexible (No Preference)' },
]

export default function ProfilePage() {
  const router = useRouter()
  const { data: existingProfile, isLoading: profileLoading } = useMyProfile()
  const createProfile = useCreateProfile()
  const updateProfile = useUpdateProfile()

  const [formData, setFormData] = useState<CreateProfileInput>({
    name: '',
    email: '',
    skills: [],
    experience_years: 0,
    seniority_level: 'mid',
    remote_preference: 'flexible',
    preferred_locations: [],
  })

  const [skillInput, setSkillInput] = useState('')
  const [locationInput, setLocationInput] = useState('')
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Populate form when existing profile loads
  useEffect(() => {
    if (existingProfile) {
      setFormData({
        name: existingProfile.name,
        email: existingProfile.email,
        skills: existingProfile.skills,
        experience_years: existingProfile.experience_years,
        seniority_level: existingProfile.seniority_level,
        remote_preference: existingProfile.remote_preference,
        preferred_locations: existingProfile.preferred_locations,
      })
    }
  }, [existingProfile])

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 5000)
  }, [])

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'experience_years' ? parseInt(value) || 0 : value,
    }))
  }

  const handleAddSkill = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && skillInput.trim()) {
      e.preventDefault()
      const newSkill = skillInput.trim()
      if (!formData.skills.includes(newSkill)) {
        setFormData((prev) => ({
          ...prev,
          skills: [...prev.skills, newSkill],
        }))
      }
      setSkillInput('')
    }
  }

  const handleRemoveSkill = (skillToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.filter((skill) => skill !== skillToRemove),
    }))
  }

  const handleAddLocation = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && locationInput.trim()) {
      e.preventDefault()
      const newLocation = locationInput.trim()
      if (!formData.preferred_locations.includes(newLocation)) {
        setFormData((prev) => ({
          ...prev,
          preferred_locations: [...prev.preferred_locations, newLocation],
        }))
      }
      setLocationInput('')
    }
  }

  const handleRemoveLocation = (locationToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      preferred_locations: prev.preferred_locations.filter(
        (loc) => loc !== locationToRemove
      ),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (existingProfile) {
        await updateProfile.mutateAsync({
          id: existingProfile.id,
          data: formData,
        })
        showToast('success', 'Profile updated successfully!')
      } else {
        await createProfile.mutateAsync(formData)
        showToast('success', 'Profile created successfully!')
        // Redirect to matches page after creating profile
        setTimeout(() => router.push('/matches'), 1500)
      }
    } catch (error) {
      showToast(
        'error',
        error instanceof Error ? error.message : 'Failed to save profile'
      )
    }
  }

  const isSubmitting = createProfile.isPending || updateProfile.isPending

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-gray-800 rounded-lg p-8 border border-gray-700">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-gray-700 rounded w-1/3" />
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 bg-gray-700 rounded w-24" />
                    <div className="h-10 bg-gray-700 rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Toast Notification */}
        {toast && (
          <div
            className={`fixed top-20 right-4 z-50 px-6 py-4 rounded-lg shadow-lg transition-all ${
              toast.type === 'success'
                ? 'bg-green-600 text-white'
                : 'bg-red-600 text-white'
            }`}
          >
            {toast.message}
          </div>
        )}

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white">
            {existingProfile ? 'Edit Profile' : 'Create Profile'}
          </h1>
          <p className="text-gray-400 mt-2">
            {existingProfile
              ? 'Update your profile to improve job matching accuracy.'
              : 'Create your profile to get personalized job matches.'}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  Full Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  Email *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="john@example.com"
                />
              </div>
            </div>

            {/* Experience */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label
                  htmlFor="experience_years"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  Years of Experience
                </label>
                <input
                  type="number"
                  id="experience_years"
                  name="experience_years"
                  value={formData.experience_years}
                  onChange={handleInputChange}
                  min="0"
                  max="50"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label
                  htmlFor="seniority_level"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  Seniority Level
                </label>
                <select
                  id="seniority_level"
                  name="seniority_level"
                  value={formData.seniority_level}
                  onChange={handleInputChange}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {seniorityLevels.map((level) => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Remote Preference */}
            <div>
              <label
                htmlFor="remote_preference"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Remote Preference
              </label>
              <select
                id="remote_preference"
                name="remote_preference"
                value={formData.remote_preference}
                onChange={handleInputChange}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {remotePreferences.map((pref) => (
                  <option key={pref.value} value={pref.value}>
                    {pref.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Skills */}
            <div>
              <label
                htmlFor="skills"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Skills (press Enter to add)
              </label>
              <input
                type="text"
                id="skills"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={handleAddSkill}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., TypeScript, React, Node.js..."
              />
              {formData.skills.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {formData.skills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center bg-blue-600/20 text-blue-400 px-3 py-1.5 rounded-lg text-sm"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        className="ml-2 text-blue-300 hover:text-white"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Preferred Locations */}
            <div>
              <label
                htmlFor="locations"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Preferred Locations (press Enter to add)
              </label>
              <input
                type="text"
                id="locations"
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                onKeyDown={handleAddLocation}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., San Francisco, New York, Remote..."
              />
              {formData.preferred_locations.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {formData.preferred_locations.map((location) => (
                    <span
                      key={location}
                      className="inline-flex items-center bg-green-600/20 text-green-400 px-3 py-1.5 rounded-lg text-sm"
                    >
                      {location}
                      <button
                        type="button"
                        onClick={() => handleRemoveLocation(location)}
                        className="ml-2 text-green-300 hover:text-white"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-4 border-t border-gray-700">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-lg transition-colors flex items-center justify-center"
              >
                {isSubmitting ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Saving...
                  </>
                ) : existingProfile ? (
                  'Update Profile'
                ) : (
                  'Create Profile'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
