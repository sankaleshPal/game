"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/components/ui/use-toast"
import { Film, SkipForward, Play, Pause } from "lucide-react"

// Store movie IDs we've already seen
const API_KEY = "32834110425a5a6e9f32ddcd98163eec"

export default function MovieGame() {
  const [movie, setMovie] = useState<string | null>(null)
  const [posterPath, setPosterPath] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState(300) // 5 minutes in seconds
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [usedMovieIds, setUsedMovieIds] = useState<number[]>([])
  const [availableIds, setAvailableIds] = useState<number[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const { toast } = useToast()

  // Fetch a list of Hindi movie IDs once on component mount
  useEffect(() => {
    const fetchMovieIds = async () => {
      try {
        // We'll fetch just the IDs first to have a pool to select from
        const response = await fetch(
          `https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&with_original_language=hi&page=1&per_page=20`,
        )

        if (!response.ok) {
          throw new Error(`API responded with status: ${response.status}`)
        }

        const data = await response.json()

        if (data.results && Array.isArray(data.results)) {
          // Extract just the IDs
          const ids = data.results.map((movie: any) => movie.id)
          setAvailableIds(ids)
        }
      } catch (error) {
        console.error("Error fetching movie IDs:", error)
      }
    }

    fetchMovieIds()
  }, [])

  useEffect(() => {
    audioRef.current = new Audio("/alarm.mp3")

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current as NodeJS.Timeout)
            setIsTimerRunning(false)
            audioRef.current?.play()
            toast({
              title: "Time's up!",
              description: "5 minutes have passed. Ready for the next movie?",
              variant: "destructive",
            })
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else if (timerRef.current) {
      clearInterval(timerRef.current)
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isTimerRunning, toast])

  const fetchMovie = async () => {
    setIsLoading(true)
    try {
      // If we don't have any available IDs yet or we've used them all, fetch more
      if (availableIds.length === 0 || availableIds.length === usedMovieIds.length) {
        // Get a random page number between 1 and 10
        const randomPage = Math.floor(Math.random() * 10) + 1

        const idsResponse = await fetch(
          `https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&with_original_language=hi&page=${randomPage}`,
        )

        if (!idsResponse.ok) {
          throw new Error(`API responded with status: ${idsResponse.status}`)
        }

        const idsData = await idsResponse.json()

        if (!idsData.results || !Array.isArray(idsData.results) || idsData.results.length === 0) {
          throw new Error("No movie results found")
        }

        // Extract just the IDs
        const newIds = idsData.results.map((movie: any) => movie.id)
        setAvailableIds(newIds)

        // If we've reset our available IDs, also reset used IDs
        if (availableIds.length === usedMovieIds.length) {
          setUsedMovieIds([])
        }
      }

      // Filter out IDs we've already used
      const unusedIds = availableIds.filter((id) => !usedMovieIds.includes(id))

      if (unusedIds.length === 0) {
        toast({
          title: "No more movies!",
          description: "You've gone through all available movies. Resetting list.",
          variant: "destructive",
        })
        setUsedMovieIds([])
        return fetchMovie() // Try again with reset list
      }

      // Pick a random unused ID
      const randomId = unusedIds[Math.floor(Math.random() * unusedIds.length)]

      // Now fetch just this one movie's details
      const movieResponse = await fetch(`https://api.themoviedb.org/3/movie/${randomId}?api_key=${API_KEY}`)

      if (!movieResponse.ok) {
        throw new Error(`API responded with status: ${movieResponse.status}`)
      }

      const movieData = await movieResponse.json()

      // Update state with this single movie
      setMovie(movieData.title)
      setPosterPath(movieData.poster_path)
      setUsedMovieIds((prev) => [...prev, randomId])

      // Reset and start timer
      setTimeLeft(300)
      setIsTimerRunning(true)
    } catch (error) {
      console.error("Error fetching movie:", error)
      toast({
        title: "Error",
        description: "Failed to fetch a movie. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const skipMovie = () => {
    if (movie) {
      fetchMovie()
    }
  }

  const toggleTimer = () => {
    setIsTimerRunning((prev) => !prev)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`
  }

  const progressPercentage = (timeLeft / 300) * 100

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 to-blue-100 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Hindi Movie Timer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {movie ? (
            <div className="space-y-6">
              <div className="rounded-lg overflow-hidden shadow-md">
                {posterPath ? (
                  <div className="relative w-full h-[350px] mx-auto">
                    <Image
                      src={`https://image.tmdb.org/t/p/w500${posterPath}`}
                      alt={movie}
                      fill
                      sizes="(max-width: 768px) 100vw, 300px"
                      className="object-contain"
                      priority
                      onError={() => setPosterPath(null)}
                    />
                  </div>
                ) : (
                  <div className="p-6 text-center bg-gradient-to-r from-purple-500 to-blue-500 h-[350px] flex items-center justify-center">
                    <h2 className="text-xl font-bold text-white">{movie}</h2>
                  </div>
                )}
              </div>

              <div className="text-center">
                <h2 className="text-xl font-bold">{movie}</h2>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Time Remaining:</span>
                  <span className="font-mono text-lg font-bold">{formatTime(timeLeft)}</span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
              </div>

              <div className="flex justify-center space-x-4">
                <Button variant="outline" size="icon" onClick={toggleTimer} className="h-10 w-10">
                  {isTimerRunning ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </Button>
                <Button variant="outline" onClick={skipMovie} className="flex items-center space-x-2">
                  <SkipForward className="h-5 w-5" />
                  <span>Skip</span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex h-40 flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-6 text-center">
              <Film className="mb-2 h-10 w-10 text-gray-400" />
              <p className="text-gray-500">Click "Get Movie" to start the game</p>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button
            onClick={fetchMovie}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            {isLoading ? "Loading..." : movie ? "Get New Movie" : "Get Movie"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

