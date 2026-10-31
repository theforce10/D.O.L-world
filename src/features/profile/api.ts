import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { resizeToSquareWebp } from '@/lib/image'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/lib/types'
import { useAuth } from '@/features/auth/AuthProvider'

export const profileKeys = {
  detail: (userId: string | undefined) => ['profile', userId] as const,
  songs: (userId: string | undefined) => ['profile', userId, 'songs'] as const,
}

export function isProfileComplete(profile: Profile | null | undefined): boolean {
  return Boolean(profile?.full_name && profile.phone && profile.snapchat)
}

export function useProfile() {
  const { user } = useAuth()
  return useQuery({
    queryKey: profileKeys.detail(user?.id),
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user!.id).single()
      if (error) throw error
      return data
    },
  })
}

/** Only the columns the database lets users edit (see column grants in the profiles migration). */
export type ProfileUpdate = Partial<Pick<Profile, 'full_name' | 'phone' | 'snapchat' | 'avatar_url' | 'marketing_consent'>>

export function useUpdateProfile() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (changes: ProfileUpdate) => {
      const { data, error } = await supabase.from('profiles').update(changes).eq('id', user!.id).select('*').single()
      if (error) throw error
      return data
    },
    onSuccess: (profile) => queryClient.setQueryData(profileKeys.detail(profile.id), profile),
  })
}

/** Resizes, uploads to avatars/<uid>/avatar.webp, and saves the public URL on the profile. */
export function useUploadAvatar() {
  const { user } = useAuth()
  const update = useUpdateProfile()
  return useMutation({
    mutationFn: async (file: File) => {
      if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.')
      const blob = await resizeToSquareWebp(file)
      const path = `${user!.id}/avatar.webp`
      const { error } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { upsert: true, contentType: 'image/webp', cacheControl: '3600' })
      if (error) throw error
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      // Version the URL so browsers/CDN show the new photo immediately.
      return update.mutateAsync({ avatar_url: `${data.publicUrl}?v=${Date.now()}` })
    },
  })
}

export function useMySongs() {
  const { user } = useAuth()
  return useQuery({
    queryKey: profileKeys.songs(user?.id),
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('song_requests')
        .select('id, song_title, artist, queue_number, status, created_at, event:events(id, name, event_date, venue)')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}
