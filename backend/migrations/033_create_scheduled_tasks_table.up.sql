CREATE TABLE IF NOT EXISTS scheduled_tasks (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description VARCHAR(200) DEFAULT '',
    cron_expr VARCHAR(100) DEFAULT '',
    status VARCHAR(20) NOT NULL DEFAULT 'running',
    last_run_at TIMESTAMP,
    next_run_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_scheduled_tasks_name ON scheduled_tasks(name);

CREATE TABLE IF NOT EXISTS task_execution_logs (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL,
    started_at TIMESTAMP NOT NULL,
    finished_at TIMESTAMP,
    status VARCHAR(20) NOT NULL,
    result_detail TEXT DEFAULT '',
    error_message TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_task_execution_logs_task FOREIGN KEY (task_id) REFERENCES scheduled_tasks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_task_execution_logs_task_id ON task_execution_logs(task_id);
