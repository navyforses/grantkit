# Logging utilities for GrantKit.
#
# Bug fix: Wrapped the body of logError() in a begin/rescue block so that an
# exception raised *inside* the logging call does not silently swallow the
# original error.  Previously, if the logger itself failed (e.g. the log file
# was not writable), the original exception would be lost and no error would
# surface to the caller.

require "logger"

# Application-wide logger — writes to STDOUT by default.
LOG = Logger.new($stdout).freeze

# Log a non-fatal error with full context.
#
# @param error [Exception, String] The error to record.  Accepts any object
#   that responds to #message; plain strings are also handled.
# @return [void]
def log_error(error)
  begin
    message = error.respond_to?(:message) ? error.message : error.to_s
    LOG.error(message)

    # Log the backtrace when available so developers can locate the source.
    if error.respond_to?(:backtrace) && error.backtrace
      LOG.error(error.backtrace.join("\n"))
    end
  rescue => logging_error
    # Fallback: if the logger itself raises, write both errors to $stderr so
    # that neither the original error nor the logging failure is masked.
    $stderr.puts "[FATAL] Logging failed: #{logging_error.message}"
    $stderr.puts "[FATAL] Original error: #{error.respond_to?(:message) ? error.message : error}"
  end
end
