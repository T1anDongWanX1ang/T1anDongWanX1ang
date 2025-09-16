/**
 * Performance Monitoring Utility
 * 
 * Story 1.8: Performance optimization and monitoring
 * 
 * This utility provides real-time performance monitoring for the configuration workflow
 */

interface PerformanceMetrics {
  step: string
  startTime: number
  endTime?: number
  duration?: number
  status: 'running' | 'completed' | 'failed'
  details?: any
}

interface WorkflowMetrics {
  sessionId: string
  startTime: number
  endTime?: number
  totalDuration?: number
  steps: PerformanceMetrics[]
  status: 'running' | 'completed' | 'failed'
}

class PerformanceMonitor {
  private sessions: Map<string, WorkflowMetrics> = new Map()
  private thresholds = {
    step1_abi_selection: 3000,      // 3 seconds
    step2_method_query: 5000,       // 5 seconds
    step3_mapping_rules: 2000,      // 2 seconds
    total_workflow: 12000           // 12 seconds (1.5x of original 8s)
  }

  /**
   * Start monitoring a new workflow session
   */
  startWorkflow(sessionId?: string): string {
    const id = sessionId || this.generateSessionId()
    
    const workflow: WorkflowMetrics = {
      sessionId: id,
      startTime: performance.now(),
      steps: [],
      status: 'running'
    }
    
    this.sessions.set(id, workflow)
    
    console.log(`🚀 Performance monitoring started for session: ${id}`)
    return id
  }

  /**
   * Start monitoring a specific step
   */
  startStep(sessionId: string, stepName: string, details?: any): void {
    const workflow = this.sessions.get(sessionId)
    if (!workflow) {
      console.warn(`⚠️ Workflow session ${sessionId} not found`)
      return
    }

    const step: PerformanceMetrics = {
      step: stepName,
      startTime: performance.now(),
      status: 'running',
      details
    }

    workflow.steps.push(step)
    
    console.log(`⏱️ Step started: ${stepName} (Session: ${sessionId})`)
  }

  /**
   * End monitoring for a specific step
   */
  endStep(sessionId: string, stepName: string, status: 'completed' | 'failed' = 'completed', details?: any): void {
    const workflow = this.sessions.get(sessionId)
    if (!workflow) return

    const step = workflow.steps.find(s => s.step === stepName && !s.endTime)
    if (!step) {
      console.warn(`⚠️ Step ${stepName} not found or already ended`)
      return
    }

    step.endTime = performance.now()
    step.duration = step.endTime - step.startTime
    step.status = status
    if (details) step.details = { ...step.details, ...details }

    // Check performance threshold
    const threshold = this.getStepThreshold(stepName)
    if (threshold && step.duration > threshold) {
      console.warn(`⚠️ Performance warning: ${stepName} took ${step.duration.toFixed(2)}ms (threshold: ${threshold}ms)`)
    } else {
      console.log(`✅ Step completed: ${stepName} in ${step.duration.toFixed(2)}ms`)
    }
  }

  /**
   * End workflow monitoring
   */
  endWorkflow(sessionId: string, status: 'completed' | 'failed' = 'completed'): WorkflowMetrics | null {
    const workflow = this.sessions.get(sessionId)
    if (!workflow) return null

    workflow.endTime = performance.now()
    workflow.totalDuration = workflow.endTime - workflow.startTime
    workflow.status = status

    // Check total workflow performance
    if (workflow.totalDuration > this.thresholds.total_workflow) {
      console.warn(`⚠️ Workflow performance warning: ${workflow.totalDuration.toFixed(2)}ms (threshold: ${this.thresholds.total_workflow}ms)`)
    } else {
      console.log(`✅ Workflow completed in ${workflow.totalDuration.toFixed(2)}ms`)
    }

    // Generate performance report
    this.generateReport(workflow)

    return workflow
  }

  /**
   * Get current performance metrics for a session
   */
  getMetrics(sessionId: string): WorkflowMetrics | null {
    return this.sessions.get(sessionId) || null
  }

  /**
   * Get performance summary for all sessions
   */
  getAllMetrics(): WorkflowMetrics[] {
    return Array.from(this.sessions.values())
  }

  /**
   * Clear old sessions (keep only recent ones)
   */
  cleanup(maxAge: number = 300000): void { // 5 minutes
    const cutoffTime = Date.now() - maxAge
    
    for (const [sessionId, workflow] of this.sessions.entries()) {
      if (workflow.startTime < cutoffTime) {
        this.sessions.delete(sessionId)
      }
    }
  }

  /**
   * Generate performance report
   */
  private generateReport(workflow: WorkflowMetrics): void {
    console.log('📊 Performance Report')
    console.log('=====================================')
    console.log(`Session ID: ${workflow.sessionId}`)
    console.log(`Total Duration: ${workflow.totalDuration?.toFixed(2)}ms`)
    console.log(`Status: ${workflow.status}`)
    console.log('-------------------------------------')
    
    workflow.steps.forEach(step => {
      const status = step.status === 'completed' ? '✅' : 
                    step.status === 'failed' ? '❌' : '⏳'
      console.log(`${status} ${step.step}: ${step.duration?.toFixed(2) || 'N/A'}ms`)
    })
    
    console.log('=====================================')

    // Check for performance issues
    const issues = this.identifyPerformanceIssues(workflow)
    if (issues.length > 0) {
      console.log('⚠️ Performance Issues Identified:')
      issues.forEach(issue => console.log(`   - ${issue}`))
    }
  }

  /**
   * Identify performance issues
   */
  private identifyPerformanceIssues(workflow: WorkflowMetrics): string[] {
    const issues: string[] = []

    // Check total workflow time
    if (workflow.totalDuration && workflow.totalDuration > this.thresholds.total_workflow) {
      issues.push(`Total workflow time exceeds threshold (${workflow.totalDuration.toFixed(2)}ms > ${this.thresholds.total_workflow}ms)`)
    }

    // Check individual steps
    workflow.steps.forEach(step => {
      if (step.duration) {
        const threshold = this.getStepThreshold(step.step)
        if (threshold && step.duration > threshold) {
          issues.push(`${step.step} exceeds threshold (${step.duration.toFixed(2)}ms > ${threshold}ms)`)
        }
      }
    })

    // Check for failed steps
    const failedSteps = workflow.steps.filter(s => s.status === 'failed')
    if (failedSteps.length > 0) {
      issues.push(`${failedSteps.length} step(s) failed: ${failedSteps.map(s => s.step).join(', ')}`)
    }

    return issues
  }

  /**
   * Get performance threshold for a step
   */
  private getStepThreshold(stepName: string): number | null {
    const normalizedName = stepName.toLowerCase().replace(/\s+/g, '_')
    
    if (normalizedName.includes('abi') || normalizedName.includes('step1')) {
      return this.thresholds.step1_abi_selection
    }
    if (normalizedName.includes('method') || normalizedName.includes('step2')) {
      return this.thresholds.step2_method_query
    }
    if (normalizedName.includes('mapping') || normalizedName.includes('step3')) {
      return this.thresholds.step3_mapping_rules
    }
    
    return null
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Export metrics to JSON for analysis
   */
  exportMetrics(): string {
    const allMetrics = this.getAllMetrics()
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      totalSessions: allMetrics.length,
      completedSessions: allMetrics.filter(w => w.status === 'completed').length,
      failedSessions: allMetrics.filter(w => w.status === 'failed').length,
      averageDuration: this.calculateAverageDuration(allMetrics),
      thresholds: this.thresholds,
      sessions: allMetrics
    }, null, 2)
  }

  /**
   * Calculate average duration for completed workflows
   */
  private calculateAverageDuration(workflows: WorkflowMetrics[]): number {
    const completed = workflows.filter(w => w.status === 'completed' && w.totalDuration)
    if (completed.length === 0) return 0
    
    const total = completed.reduce((sum, w) => sum + (w.totalDuration || 0), 0)
    return total / completed.length
  }
}

// Global instance
export const performanceMonitor = new PerformanceMonitor()

// React Hook for performance monitoring
export function usePerformanceMonitor() {
  const startWorkflow = (sessionId?: string) => {
    return performanceMonitor.startWorkflow(sessionId)
  }

  const startStep = (sessionId: string, stepName: string, details?: any) => {
    performanceMonitor.startStep(sessionId, stepName, details)
  }

  const endStep = (sessionId: string, stepName: string, status?: 'completed' | 'failed', details?: any) => {
    performanceMonitor.endStep(sessionId, stepName, status, details)
  }

  const endWorkflow = (sessionId: string, status?: 'completed' | 'failed') => {
    return performanceMonitor.endWorkflow(sessionId, status)
  }

  const getMetrics = (sessionId: string) => {
    return performanceMonitor.getMetrics(sessionId)
  }

  return {
    startWorkflow,
    startStep,
    endStep,
    endWorkflow,
    getMetrics
  }
}

// Export types for use in components
export type { PerformanceMetrics, WorkflowMetrics }