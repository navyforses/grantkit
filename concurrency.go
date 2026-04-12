// Package main demonstrates safe concurrent access to a shared counter.
//
// Concurrency fix: Added sync.Mutex locking around every read/write of the
// `counter` variable. Without a mutex (or another synchronisation primitive),
// concurrent goroutines can read and write the counter simultaneously, causing
// a data race and unpredictable results.
package main

import (
	"fmt"
	"sync"
)

var (
	// mu guards counter so that only one goroutine can modify it at a time,
	// preventing race conditions in high-concurrency scenarios.
	mu      sync.Mutex
	counter int
)

// incrementCounter safely increments the shared counter.
// The mutex is locked before the write and unlocked via defer when the
// function returns, even if a panic occurs.
func incrementCounter() {
	mu.Lock()
	defer mu.Unlock()
	counter++
}

// getCounter safely reads the current value of the shared counter.
func getCounter() int {
	mu.Lock()
	defer mu.Unlock()
	return counter
}

func main() {
	var wg sync.WaitGroup

	// Spawn 100 goroutines, each incrementing the counter once.
	for i := 0; i < 100; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			incrementCounter()
		}()
	}

	wg.Wait()
	fmt.Printf("Final counter value: %d\n", getCounter()) // Expected: 100
}
