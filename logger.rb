require "logger"
require "fileutils"
require "time"

class GrantKitLogger
  DEFAULT_ROTATE = "daily"

  def initialize(log_file: nil, rotate: DEFAULT_ROTATE)
    if log_file
      file_path = build_file_logger(log_file, rotate)
      @logger = Logger.new(file_path, rotate)
    else
      @logger = Logger.new($stdout)
    end
    @logger.level = Logger::INFO
    @logger.formatter = proc do |severity, datetime, _progname, msg|
      "[#{datetime.utc.iso8601}] #{severity}: #{msg}\n"
    end
  end

  def info(msg)
    @logger.info(msg)
  end

  def warn(msg)
    @logger.warn(msg)
  end

  def error(msg)
    @logger.error(msg)
  end

  private

  def build_file_logger(log_file, _rotate)
    dir = File.dirname(log_file)
    FileUtils.mkdir_p(dir) unless dir.nil? || dir == "."
    log_file
  end
end

# Backward-compatible global logger helper.
LOG = GrantKitLogger.new

def log_error(error)
  begin
    message = error.respond_to?(:message) ? error.message : error.to_s
    LOG.error(message)

    if error.respond_to?(:backtrace) && error.backtrace
      LOG.error(error.backtrace.join("\n"))
    end
  rescue => logging_error
    $stderr.puts "[FATAL] Logging failed: #{logging_error.message}"
    $stderr.puts "[FATAL] Original error: #{error.respond_to?(:message) ? error.message : error}"
  end
end
