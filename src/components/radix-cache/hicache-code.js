// Teaching pseudocode: operations and dependency order, not literal SGLang API names.
export const hcCode={
 split:'prefix, old_suffix = split_node(node, matched_page_boundary)\nprefix.pages = old_pages[:matched_pages]\nold_suffix.pages = old_pages[matched_pages:]\n# Relink metadata; do not allocate or copy KV.\nprotect(prefix)',
 match:'gpu_prefix, host_prefix = tree.match_prefix(tokens)\nif match_ends_inside_node: schedule_split()\nelse: protect(gpu_prefix)  # metadata only; no KV copy',
 query:'keys = prefix_chain_keys(tokens[local_hit:])\nremote_hit = backend.exists_contiguous(keys)',
 prefetchStage:'dst = host_pool.allocate(accepted_pages)\nevent = backend.read(keys, dst)\nawait event.ack()\ntree.publish_host_pages(dst)',
 policy:'ready = longest_contiguous_completed_prefix()\nstop_prefetch(policy, gpu_ready, deadline)\nmissing = tokens[local_hit + ready:]',
 backupVictim:'assert victim.active_refs == 0\nevent = copy_gpu_to_host(victim)\nawait event.ack()\nvictim.host_copy = event.destination',
 evict:'assert victim.active_refs == 0\n# Under write_back, backup ack precedes this.\ngpu_pool.free(victim.gpu_pages)\nvictim.gpu_pages = None',
 load:'gpu_pages = gpu_pool.allocate(hit_pages)\nevent = copy_host_to_gpu(host_pages, gpu_pages)\nawait event.ack()\ntree.publish_gpu_pages(gpu_pages); protect(hit_path)',
 compute:'assert reused_prefix.is_gpu_ready\nkv_new = prefill(missing_suffix, reused_prefix)\ntree.insert(tokens, kv_new); protect(new_path)',
 backup:'eligible = select_by_write_policy(access_counts)\nevent = copy_gpu_to_host(eligible.without_host_copy)\nawait event.ack()\n# Source GPU pages stay resident.',
 persist:'keys = compatible_prefix_chain_keys(eligible_pages)\nnew_keys = keys - backend.existing(keys)\nawait backend.write(new_keys, host_pages).ack()',
 release:'release_references(request.path)\n# Retain cache pages. Unlocked leaves may be evicted.',
};
