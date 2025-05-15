import { defineAction, defineState, dispatchAction, getMutableState, getState, matches } from '@ir-engine/hyperflux'

export const GitActions = {
  addFile: defineAction({
    type: 'git.ADD_FILE',
    path: matches.string,
    content: matches.string // hash in real implementation
  }),

  createCommit: defineAction({
    type: 'git.CREATE_COMMIT',
    message: matches.string,
    author: matches.string,
    parentCommit: matches.string.optional(),
    files: matches.arrayOf(matches.object)
  }),

  updateBranch: defineAction({
    type: 'git.UPDATE_BRANCH',
    name: matches.string,
    commitId: matches.string
  }),

  checkoutBranch: defineAction({
    type: 'git.CHECKOUT_BRANCH',
    name: matches.string
  }),

  mergeBranch: defineAction({
    type: 'git.MERGE_BRANCH',
    source: matches.string,
    target: matches.string
  })
}

export const GitState = defineState({
  name: 'git.RepoState',
  initial: () => ({
    files: {} as Record<string, string>, // path -> content hash
    commits: {} as Record<string, any>,
    branches: {} as Record<string, string>, // name -> commitId
    HEAD: 'main',
    headCommit: ''
  }),

  receptors: {
    onAddFile: GitActions.addFile.receive((a) => {
      getMutableState(GitState).files[a.path].set(a.content)
    }),

    onCreateCommit: GitActions.createCommit.receive((a) => {
      const state = getMutableState(GitState)
      const id = `commit:${crypto.randomUUID()}`
      state.commits[id].set({
        message: a.message,
        author: a.author,
        files: a.files,
        parent: a.parentCommit
      })
      state.headCommit.set(id)
    }),

    onUpdateBranch: GitActions.updateBranch.receive((a) => {
      getMutableState(GitState).branches[a.name].set(a.commitId)
    }),

    onCheckoutBranch: GitActions.checkoutBranch.receive((a) => {
      const state = getMutableState(GitState)
      state.HEAD.set(a.name)
      state.headCommit.set(state.branches[a.name].get())
    }),

    onMergeBranch: GitActions.mergeBranch.receive((a) => {
      // Simplified merge strategy: fast-forward only
      const state = getMutableState(GitState)
      const sourceCommit = state.branches[a.source].get()
      state.branches[a.target].set(sourceCommit)
    })
  },

  gitAdd: (path: string, content: string) => {
    dispatchAction(GitActions.addFile({ path, content }))
  },

  gitCommit: (message: string, author: string) => {
    const files = Object.entries(getState(GitState).files).map(([path, content]) => ({ path, content }))
    dispatchAction(
      GitActions.createCommit({
        message,
        author,
        files,
        parentCommit: getState(GitState).headCommit
      })
    )
  },

  gitCheckout: (branch: string) => {
    dispatchAction(GitActions.checkoutBranch({ name: branch }))
  },

  gitBranch: (name: string) => {
    dispatchAction(
      GitActions.updateBranch({
        name,
        commitId: getState(GitState).headCommit
      })
    )
  },

  gitMerge: (source: string, target: string) => {
    dispatchAction(GitActions.mergeBranch({ source, target }))
  }
})
