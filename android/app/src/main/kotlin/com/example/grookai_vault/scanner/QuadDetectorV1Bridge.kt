package com.example.grookai_vault.scanner

import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodCall
import io.flutter.plugin.common.MethodChannel
import java.util.ArrayDeque
import kotlin.math.abs
import kotlin.math.exp
import kotlin.math.ln
import kotlin.math.max
import kotlin.math.min

object QuadDetectorV1Bridge {
    private const val CHANNEL = "gv/quad_detector_v1"
    private const val GRID_WIDTH = 96
    private const val GRID_HEIGHT = 160
    private const val CARD_ASPECT = 0.716
    private const val SEARCH_LEFT = 0.06
    private const val SEARCH_TOP = 0.05
    private const val SEARCH_RIGHT = 0.94
    private const val SEARCH_BOTTOM = 0.96

    fun register(flutterEngine: FlutterEngine) {
        MethodChannel(
            flutterEngine.dartExecutor.binaryMessenger,
            CHANNEL,
        ).setMethodCallHandler { call, result ->
            when (call.method) {
                "detectQuadYuv420", "detectWithDiagnostics" -> {
                    result.success(detectQuad(call))
                }
                else -> result.notImplemented()
            }
        }
    }

    private fun detectQuad(call: MethodCall): Map<String, Any?> {
        val startedAt = System.nanoTime()
        val width = (call.argument<Number>("width") ?: 0).toInt()
        val height = (call.argument<Number>("height") ?: 0).toInt()
        val rotation = normalizedRotation((call.argument<Number>("rotation") ?: 0).toInt())
        val yBytes = call.argument<ByteArray>("y")
        val uBytes = call.argument<ByteArray>("u")
        val vBytes = call.argument<ByteArray>("v")
        val yRowStride = (call.argument<Number>("yRowStride") ?: width).toInt()
        val uvRowStride = (call.argument<Number>("uvRowStride") ?: max(1, width / 2)).toInt()
        val uvPixelStride = (call.argument<Number>("uvPixelStride") ?: 1).toInt()

        if (
            width <= 0 ||
            height <= 0 ||
            yBytes == null ||
            uBytes == null ||
            vBytes == null ||
            yRowStride <= 0 ||
            uvRowStride <= 0 ||
            uvPixelStride <= 0
        ) {
            return failure(
                startedAt = startedAt,
                reason = "invalid_yuv_frame",
                width = width,
                height = height,
                rotation = rotation,
            )
        }

        val frame = YuvFrame(
            width = width,
            height = height,
            yBytes = yBytes,
            uBytes = uBytes,
            vBytes = vBytes,
            yRowStride = yRowStride,
            uvRowStride = uvRowStride,
            uvPixelStride = uvPixelStride,
            rotation = rotation,
        )
        val displayWidth = if (rotation == 90 || rotation == 270) height else width
        val displayHeight = if (rotation == 90 || rotation == 270) width else height
        if (displayWidth <= 0 || displayHeight <= 0) {
            return failure(
                startedAt = startedAt,
                reason = "invalid_display_dimensions",
                width = width,
                height = height,
                rotation = rotation,
            )
        }
        val displayAspect = displayWidth.toDouble() / displayHeight.toDouble()
        val targetDisplayAspect = CARD_ASPECT / displayAspect

        val grid = buildGrid(frame)
        if (grid.sampleCount < 50) {
            return failure(
                startedAt = startedAt,
                reason = "insufficient_samples",
                width = width,
                height = height,
                rotation = rotation,
                extraDiagnostics = mapOf("sample_count" to grid.sampleCount),
            )
        }

        val seedMask = buildSeedMask(grid)
        val edgeMask = buildEdgeMask(grid)
        val smoothedSeedMask = closeSeedMask(seedMask)
        val seedComponents = findComponents(smoothedSeedMask)
            .filter { component ->
                component.count >= 3 &&
                    component.areaRatio in 0.0004..0.18 &&
                    component.centerX in SEARCH_LEFT..SEARCH_RIGHT &&
                    component.centerY in SEARCH_TOP..SEARCH_BOTTOM
            }

        if (seedComponents.isEmpty()) {
            return failure(
                startedAt = startedAt,
                reason = "no_card_component",
                width = width,
                height = height,
                rotation = rotation,
                extraDiagnostics = mapOf(
                    "seed_component_count" to 0,
                    "seed_pixel_count" to seedMask.count { it },
                    "edge_pixel_count" to edgeMask.count { it },
                    "chroma_threshold" to grid.chromaThreshold,
                    "dark_luma_threshold" to grid.darkLumaThreshold,
                    "edge_threshold" to grid.edgeThreshold,
                ),
                debugMasks = debugMasks(seedMask, edgeMask, smoothedSeedMask),
            )
        }

        val clusters = clusterSeedComponents(seedComponents)
        val candidates = mutableListOf<CandidateScore>()
        val rejectionReasons = mutableListOf<String>()
        for ((index, cluster) in clusters.withIndex()) {
            val candidate = scoreClusterCandidate(
                clusterIndex = index,
                cluster = cluster,
                grid = grid,
                edgeMask = edgeMask,
                targetDisplayAspect = targetDisplayAspect,
            )
            if (candidate == null) {
                rejectionReasons.add("cluster_$index:score_below_threshold")
            } else {
                candidates.add(candidate)
            }
        }

        val best = candidates.maxByOrNull { it.score }
        if (best == null || best.score < 0.38) {
            return failure(
                startedAt = startedAt,
                reason = "no_candidate_above_threshold",
                width = width,
                height = height,
                rotation = rotation,
                extraDiagnostics = mapOf(
                    "seed_component_count" to seedComponents.size,
                    "cluster_count" to clusters.size,
                    "candidate_score_count" to candidates.size,
                    "best_candidate_score" to best?.score,
                    "rejected_candidate_reasons" to rejectionReasons.take(12),
                    "seed_pixel_count" to seedMask.count { it },
                    "edge_pixel_count" to edgeMask.count { it },
                    "chroma_threshold" to grid.chromaThreshold,
                    "dark_luma_threshold" to grid.darkLumaThreshold,
                    "edge_threshold" to grid.edgeThreshold,
                ),
                debugMasks = debugMasks(seedMask, edgeMask, smoothedSeedMask),
            )
        }

        val rect = best.rect.toNormRect()
        val points = listOf(
            mapOf("x" to rect.left, "y" to rect.top),
            mapOf("x" to rect.right, "y" to rect.top),
            mapOf("x" to rect.right, "y" to rect.bottom),
            mapOf("x" to rect.left, "y" to rect.bottom),
        )
        val confidence = (0.42 + (best.score * 0.58)).coerceIn(0.0, 0.98)

        return mapOf(
            "success" to true,
            "points" to points,
            "confidence" to confidence,
            "elapsed_ms" to elapsedMillis(startedAt),
            "failure_reason" to null,
            "diagnostics" to mapOf(
                "pipeline" to "seed_cluster_outer_boundary_v4",
                "detector_registered" to true,
                "detector_called" to true,
                "detector_success" to true,
                "selected_candidate_source" to "seed_cluster_outer_boundary_v4",
                "width" to width,
                "height" to height,
                "rotation" to rotation,
                "grid_width" to GRID_WIDTH,
                "grid_height" to GRID_HEIGHT,
                "seed_component_count" to seedComponents.size,
                "cluster_count" to clusters.size,
                "cluster_sizes" to clusters.map { it.count }.take(16),
                "selected_cluster_id" to best.clusterIndex,
                "selected_cluster_size" to best.cluster.count,
                "cluster_merge_count" to clusters.sumOf { max(0, it.componentCount - 1) },
                "candidate_score_count" to candidates.size,
                "best_candidate_score" to best.score,
                "best_candidate_aspect" to best.aspect,
                "best_candidate_area" to best.areaRatio,
                "best_candidate_edge_support" to best.edgeSupport,
                "best_candidate_seed_coverage" to best.seedCoverage,
                "selected_cluster_rect" to best.cluster.rect.toMap(),
                "expanded_outer_rect" to best.rect.toMap(),
                "expansion_left" to best.expansionLeft,
                "expansion_right" to best.expansionRight,
                "expansion_top" to best.expansionTop,
                "expansion_bottom" to best.expansionBottom,
                "outer_edge_support" to mapOf(
                    "left" to best.leftEdgeSupport,
                    "right" to best.rightEdgeSupport,
                    "top" to best.topEdgeSupport,
                    "bottom" to best.bottomEdgeSupport,
                ),
                "expansion_stop_reasons" to best.expansionStopReasons,
                "content_vs_outer_area_ratio" to best.contentVsOuterAreaRatio,
                "chroma_threshold" to grid.chromaThreshold,
                "dark_luma_threshold" to grid.darkLumaThreshold,
                "edge_threshold" to grid.edgeThreshold,
                "seed_pixel_count" to seedMask.count { it },
                "edge_pixel_count" to edgeMask.count { it },
                "debug_masks" to debugMasks(seedMask, edgeMask, smoothedSeedMask),
            ),
        )
    }

    private fun buildGrid(frame: YuvFrame): Grid {
        val chromaValues = mutableListOf<Int>()
        val lumaValues = mutableListOf<Int>()
        val lumaGrid = IntArray(GRID_WIDTH * GRID_HEIGHT)
        val chromaGrid = IntArray(GRID_WIDTH * GRID_HEIGHT)
        var sampleCount = 0

        for (gy in 0 until GRID_HEIGHT) {
            val displayY = (gy + 0.5) / GRID_HEIGHT
            if (displayY < SEARCH_TOP || displayY > SEARCH_BOTTOM) continue
            for (gx in 0 until GRID_WIDTH) {
                val displayX = (gx + 0.5) / GRID_WIDTH
                if (displayX < SEARCH_LEFT || displayX > SEARCH_RIGHT) continue
                val sample = frame.sampleDisplay(displayX, displayY)
                val index = gridIndex(gx, gy)
                lumaGrid[index] = sample.y
                chromaGrid[index] = sample.chroma
                lumaValues.add(sample.y)
                chromaValues.add(sample.chroma)
                sampleCount += 1
            }
        }

        lumaValues.sort()
        chromaValues.sort()
        val chromaP88 = percentile(chromaValues, 0.88)
        val lumaP12 = percentile(lumaValues, 0.12)
        val lumaP88 = percentile(lumaValues, 0.88)
        val chromaThreshold = max(22, min(72, chromaP88))
        val darkLumaThreshold = max(40, min(96, lumaP12 + 12))
        val brightLumaThreshold = max(168, min(236, lumaP88 + 4))
        val edgeGrid = IntArray(GRID_WIDTH * GRID_HEIGHT)
        val edgeValues = mutableListOf<Int>()

        for (gy in 1 until GRID_HEIGHT - 1) {
            for (gx in 1 until GRID_WIDTH - 1) {
                val index = gridIndex(gx, gy)
                val yValue = lumaGrid[index]
                if (yValue == 0) continue
                val gxEdge = abs(lumaGrid[gridIndex(gx + 1, gy)] - lumaGrid[gridIndex(gx - 1, gy)])
                val gyEdge = abs(lumaGrid[gridIndex(gx, gy + 1)] - lumaGrid[gridIndex(gx, gy - 1)])
                val chromaEdge =
                    abs(chromaGrid[gridIndex(gx + 1, gy)] - chromaGrid[gridIndex(gx - 1, gy)]) +
                        abs(chromaGrid[gridIndex(gx, gy + 1)] - chromaGrid[gridIndex(gx, gy - 1)])
                val strength = gxEdge + gyEdge + (chromaEdge / 3)
                edgeGrid[index] = strength
                edgeValues.add(strength)
            }
        }
        edgeValues.sort()
        val edgeThreshold = max(18, min(72, percentile(edgeValues, 0.82)))

        return Grid(
            luma = lumaGrid,
            chroma = chromaGrid,
            edge = edgeGrid,
            sampleCount = sampleCount,
            chromaThreshold = chromaThreshold,
            darkLumaThreshold = darkLumaThreshold,
            brightLumaThreshold = brightLumaThreshold,
            edgeThreshold = edgeThreshold,
        )
    }

    private fun buildSeedMask(grid: Grid): BooleanArray {
        val mask = BooleanArray(GRID_WIDTH * GRID_HEIGHT)
        for (gy in 0 until GRID_HEIGHT) {
            val displayY = (gy + 0.5) / GRID_HEIGHT
            if (displayY < SEARCH_TOP || displayY > SEARCH_BOTTOM) continue
            for (gx in 0 until GRID_WIDTH) {
                val displayX = (gx + 0.5) / GRID_WIDTH
                if (displayX < SEARCH_LEFT || displayX > SEARCH_RIGHT) continue
                val index = gridIndex(gx, gy)
                val luma = grid.luma[index]
                val chroma = grid.chroma[index]
                if (luma <= 0) continue
                val highChroma = chroma >= grid.chromaThreshold && luma in 24..245
                val darkInk = luma <= grid.darkLumaThreshold && luma >= 8
                val brightInteriorDetail =
                    luma >= grid.brightLumaThreshold &&
                        chroma >= max(14, grid.chromaThreshold - 14)
                val structuralEdge =
                    luma in 34..236 &&
                        grid.edge[index] >= max(grid.edgeThreshold + 10, (grid.edgeThreshold * 1.35).toInt())
                if (highChroma || darkInk || brightInteriorDetail || structuralEdge) {
                    mask[index] = true
                }
            }
        }
        return mask
    }

    private fun buildEdgeMask(grid: Grid): BooleanArray {
        val mask = BooleanArray(GRID_WIDTH * GRID_HEIGHT)
        for (index in grid.edge.indices) {
            mask[index] = grid.edge[index] >= grid.edgeThreshold
        }
        return mask
    }

    private fun closeSeedMask(seedMask: BooleanArray): BooleanArray {
        val dilated = BooleanArray(seedMask.size)
        for (gy in 1 until GRID_HEIGHT - 1) {
            for (gx in 1 until GRID_WIDTH - 1) {
                val index = gridIndex(gx, gy)
                if (seedMask[index]) {
                    dilated[index] = true
                    continue
                }
                var neighbors = 0
                for (oy in -1..1) {
                    for (ox in -1..1) {
                        if (ox == 0 && oy == 0) continue
                        if (seedMask[gridIndex(gx + ox, gy + oy)]) neighbors += 1
                    }
                }
                dilated[index] = neighbors >= 2
            }
        }

        val closed = BooleanArray(seedMask.size)
        for (gy in 1 until GRID_HEIGHT - 1) {
            for (gx in 1 until GRID_WIDTH - 1) {
                val index = gridIndex(gx, gy)
                if (!dilated[index]) continue
                var neighbors = 0
                for (oy in -1..1) {
                    for (ox in -1..1) {
                        if (dilated[gridIndex(gx + ox, gy + oy)]) neighbors += 1
                    }
                }
                closed[index] = neighbors >= 3
            }
        }
        return closed
    }

    private fun findComponents(mask: BooleanArray): List<Component> {
        val visited = BooleanArray(mask.size)
        val components = mutableListOf<Component>()
        for (gy in 0 until GRID_HEIGHT) {
            for (gx in 0 until GRID_WIDTH) {
                val start = gridIndex(gx, gy)
                if (!mask[start] || visited[start]) continue
                components.add(floodFill(mask, visited, gx, gy))
            }
        }
        return components
    }

    private fun floodFill(mask: BooleanArray, visited: BooleanArray, startX: Int, startY: Int): Component {
        val queue = ArrayDeque<Int>()
        queue.add(gridIndex(startX, startY))
        visited[gridIndex(startX, startY)] = true
        var count = 0
        var minX = startX
        var maxX = startX
        var minY = startY
        var maxY = startY

        while (!queue.isEmpty()) {
            val index = queue.removeFirst()
            val x = index % GRID_WIDTH
            val y = index / GRID_WIDTH
            count += 1
            minX = min(minX, x)
            maxX = max(maxX, x)
            minY = min(minY, y)
            maxY = max(maxY, y)

            for (oy in -1..1) {
                for (ox in -1..1) {
                    if (ox == 0 && oy == 0) continue
                    val nx = x + ox
                    val ny = y + oy
                    if (nx < 0 || nx >= GRID_WIDTH || ny < 0 || ny >= GRID_HEIGHT) continue
                    val next = gridIndex(nx, ny)
                    if (!mask[next] || visited[next]) continue
                    visited[next] = true
                    queue.add(next)
                }
            }
        }

        return Component(
            count = count,
            rect = GridRect(minX = minX, minY = minY, maxX = maxX, maxY = maxY),
            componentCount = 1,
        )
    }

    private fun clusterSeedComponents(components: List<Component>): List<Component> {
        val clusters = components.map { it.copy() }.toMutableList()
        val thresholdX = max(6, GRID_WIDTH / 10)
        val thresholdY = max(10, GRID_HEIGHT / 9)
        var merged: Boolean
        do {
            merged = false
            loop@ for (i in 0 until clusters.size) {
                for (j in i + 1 until clusters.size) {
                    if (rectsNear(clusters[i].rect, clusters[j].rect, thresholdX, thresholdY)) {
                        clusters[i] = mergeComponents(clusters[i], clusters[j])
                        clusters.removeAt(j)
                        merged = true
                        break@loop
                    }
                }
            }
        } while (merged)

        return clusters.filter { cluster ->
            cluster.count >= 8 &&
                cluster.areaRatio >= 0.0025 &&
                cluster.areaRatio <= 0.42 &&
                !touchesFrameTooMuch(cluster.rect)
        }
    }

    private fun scoreClusterCandidate(
        clusterIndex: Int,
        cluster: Component,
        grid: Grid,
        edgeMask: BooleanArray,
        targetDisplayAspect: Double,
    ): CandidateScore? {
        val maxMarginX = max(12, (GRID_WIDTH * 0.20).toInt())
        val maxMarginTop = max(14, (GRID_HEIGHT * 0.18).toInt())
        val maxMarginBottom = max(20, (GRID_HEIGHT * 0.28).toInt())
        val searchRect = GridRect(
            minX = max((SEARCH_LEFT * GRID_WIDTH).toInt(), cluster.rect.minX - maxMarginX),
            minY = max((SEARCH_TOP * GRID_HEIGHT).toInt(), cluster.rect.minY - maxMarginTop),
            maxX = min((SEARCH_RIGHT * GRID_WIDTH).toInt(), cluster.rect.maxX + maxMarginX),
            maxY = min((SEARCH_BOTTOM * GRID_HEIGHT).toInt(), cluster.rect.maxY + maxMarginBottom),
        )
        if (searchRect.width < 12 || searchRect.height < 20) return null

        val leftLine = strongestVerticalLine(
            grid = grid,
            edgeMask = edgeMask,
            xRange = searchRect.minX..cluster.rect.minX,
            yRange = searchRect.minY..searchRect.maxY,
        )
        val rightLine = strongestVerticalLine(
            grid = grid,
            edgeMask = edgeMask,
            xRange = cluster.rect.maxX..searchRect.maxX,
            yRange = searchRect.minY..searchRect.maxY,
        )
        val topLine = strongestHorizontalLine(
            grid = grid,
            edgeMask = edgeMask,
            xRange = searchRect.minX..searchRect.maxX,
            yRange = searchRect.minY..cluster.rect.minY,
        )
        val bottomLine = strongestHorizontalLine(
            grid = grid,
            edgeMask = edgeMask,
            xRange = searchRect.minX..searchRect.maxX,
            yRange = cluster.rect.maxY..searchRect.maxY,
        )

        val rawRect = GridRect(
            minX = min(leftLine.position, cluster.rect.minX).coerceAtLeast(searchRect.minX),
            minY = min(topLine.position, cluster.rect.minY).coerceAtLeast(searchRect.minY),
            maxX = max(rightLine.position, cluster.rect.maxX).coerceAtMost(searchRect.maxX),
            maxY = max(bottomLine.position, cluster.rect.maxY).coerceAtMost(searchRect.maxY),
        ).expanded(left = 1, top = 1, right = 1, bottom = 2)
            .clamped(searchRect)

        val rect = fitAspect(
            rect = rawRect,
            bounds = searchRect,
            targetDisplayAspect = targetDisplayAspect,
            cluster = cluster.rect,
        )
        if (rect.width < 18 || rect.height < 24) return null
        if (touchesFrameTooMuch(rect)) return null

        val areaRatio = rect.areaRatio
        if (areaRatio < 0.018 || areaRatio > 0.68) return null
        val aspect = rect.normWidth / max(0.001, rect.normHeight)
        val aspectScore = aspectScore(aspect, targetDisplayAspect)
        if (aspectScore < 0.22) return null

        val leftSupport = lineSupportAtVertical(grid, edgeMask, rect.minX, rect.minY, rect.maxY)
        val rightSupport = lineSupportAtVertical(grid, edgeMask, rect.maxX, rect.minY, rect.maxY)
        val topSupport = lineSupportAtHorizontal(grid, edgeMask, rect.minX, rect.maxX, rect.minY)
        val bottomSupport = lineSupportAtHorizontal(grid, edgeMask, rect.minX, rect.maxX, rect.maxY)
        val edgeSupport = (leftSupport + rightSupport + topSupport + bottomSupport) / 4.0
        val minSideSupport = min(min(leftSupport, rightSupport), min(topSupport, bottomSupport))
        val seedCoverage = (cluster.count.toDouble() / max(1.0, rect.area.toDouble())).coerceIn(0.0, 1.0)
        val compactness = cluster.areaRatio / areaRatio
        val coverageScore = exp(-abs(seedCoverage - 0.16) * 4.0).coerceIn(0.0, 1.0)
        val centerX = rect.centerX
        val centerY = rect.centerY
        val centerScore =
            (1.0 - ((abs(centerX - 0.5) * 0.9) + (abs(centerY - 0.56) * 0.45))).coerceIn(0.0, 1.0)
        val sizePenalty = when {
            areaRatio > 0.56 -> (areaRatio - 0.56) * 1.4
            areaRatio < 0.04 -> (0.04 - areaRatio) * 3.0
            else -> 0.0
        }
        val weakEdgePenalty = if (minSideSupport < 0.035) 0.12 else 0.0
        val boundaryPenalty = if (rect.nearFrameBorder()) 0.10 else 0.0
        val score =
            (aspectScore * 0.28) +
                (edgeSupport * 0.30) +
                (coverageScore * 0.17) +
                (centerScore * 0.13) +
                (compactness.coerceIn(0.0, 1.0) * 0.12) -
                sizePenalty -
                weakEdgePenalty -
                boundaryPenalty

        if (score < 0.28) return null
        return CandidateScore(
            clusterIndex = clusterIndex,
            cluster = cluster,
            rect = rect,
            score = score.coerceIn(0.0, 1.0),
            aspect = aspect,
            areaRatio = areaRatio,
            edgeSupport = edgeSupport,
            seedCoverage = seedCoverage,
            leftEdgeSupport = leftSupport,
            rightEdgeSupport = rightSupport,
            topEdgeSupport = topSupport,
            bottomEdgeSupport = bottomSupport,
            expansionLeft = cluster.rect.minX - rect.minX,
            expansionRight = rect.maxX - cluster.rect.maxX,
            expansionTop = cluster.rect.minY - rect.minY,
            expansionBottom = rect.maxY - cluster.rect.maxY,
            expansionStopReasons = mapOf(
                "left" to leftLine.reason,
                "right" to rightLine.reason,
                "top" to topLine.reason,
                "bottom" to bottomLine.reason,
            ),
            contentVsOuterAreaRatio = cluster.areaRatio / max(0.001, areaRatio),
        )
    }

    private fun strongestVerticalLine(
        grid: Grid,
        edgeMask: BooleanArray,
        xRange: IntRange,
        yRange: IntRange,
    ): LineScore {
        var bestPosition = xRange.first
        var bestSupport = -1.0
        for (x in xRange) {
            val support = lineSupportAtVertical(grid, edgeMask, x.coerceIn(1, GRID_WIDTH - 2), yRange.first, yRange.last)
            if (support > bestSupport) {
                bestSupport = support
                bestPosition = x
            }
        }
        return LineScore(
            position = bestPosition.coerceIn(0, GRID_WIDTH - 1),
            support = bestSupport.coerceAtLeast(0.0),
            reason = if (bestSupport >= 0.08) "edge_found" else "max_expansion",
        )
    }

    private fun strongestHorizontalLine(
        grid: Grid,
        edgeMask: BooleanArray,
        xRange: IntRange,
        yRange: IntRange,
    ): LineScore {
        var bestPosition = yRange.first
        var bestSupport = -1.0
        for (y in yRange) {
            val support = lineSupportAtHorizontal(grid, edgeMask, xRange.first, xRange.last, y.coerceIn(1, GRID_HEIGHT - 2))
            if (support > bestSupport) {
                bestSupport = support
                bestPosition = y
            }
        }
        return LineScore(
            position = bestPosition.coerceIn(0, GRID_HEIGHT - 1),
            support = bestSupport.coerceAtLeast(0.0),
            reason = if (bestSupport >= 0.08) "edge_found" else "max_expansion",
        )
    }

    private fun lineSupportAtVertical(
        grid: Grid,
        edgeMask: BooleanArray,
        x: Int,
        minY: Int,
        maxY: Int,
    ): Double {
        var hits = 0
        var total = 0
        var strength = 0.0
        val cx = x.coerceIn(1, GRID_WIDTH - 2)
        for (y in minY.coerceAtLeast(1)..maxY.coerceAtMost(GRID_HEIGHT - 2)) {
            var localEdge = 0
            var localHit = false
            for (ox in -1..1) {
                val index = gridIndex(cx + ox, y)
                localEdge = max(localEdge, grid.edge[index])
                localHit = localHit || edgeMask[index]
            }
            if (localHit) hits += 1
            strength += (localEdge.toDouble() / max(1, grid.edgeThreshold * 2)).coerceIn(0.0, 1.0)
            total += 1
        }
        if (total == 0) return 0.0
        return ((hits.toDouble() / total) * 0.72 + (strength / total) * 0.28).coerceIn(0.0, 1.0)
    }

    private fun lineSupportAtHorizontal(
        grid: Grid,
        edgeMask: BooleanArray,
        minX: Int,
        maxX: Int,
        y: Int,
    ): Double {
        var hits = 0
        var total = 0
        var strength = 0.0
        val cy = y.coerceIn(1, GRID_HEIGHT - 2)
        for (x in minX.coerceAtLeast(1)..maxX.coerceAtMost(GRID_WIDTH - 2)) {
            var localEdge = 0
            var localHit = false
            for (oy in -1..1) {
                val index = gridIndex(x, cy + oy)
                localEdge = max(localEdge, grid.edge[index])
                localHit = localHit || edgeMask[index]
            }
            if (localHit) hits += 1
            strength += (localEdge.toDouble() / max(1, grid.edgeThreshold * 2)).coerceIn(0.0, 1.0)
            total += 1
        }
        if (total == 0) return 0.0
        return ((hits.toDouble() / total) * 0.72 + (strength / total) * 0.28).coerceIn(0.0, 1.0)
    }

    private fun fitAspect(
        rect: GridRect,
        bounds: GridRect,
        targetDisplayAspect: Double,
        cluster: GridRect,
    ): GridRect {
        var width = rect.width.toDouble()
        var height = rect.height.toDouble()
        val currentAspect = (width / GRID_WIDTH) / max(0.001, height / GRID_HEIGHT)
        if (currentAspect > targetDisplayAspect) {
            height = width / GRID_WIDTH / targetDisplayAspect * GRID_HEIGHT
        } else {
            width = height / GRID_HEIGHT * targetDisplayAspect * GRID_WIDTH
        }

        val centerX = ((rect.minX + rect.maxX) / 2.0).coerceIn(
            cluster.minX + 0.0,
            cluster.maxX + 0.0,
        )
        val centerY = ((rect.minY + rect.maxY) / 2.0).coerceIn(
            cluster.minY + 0.0,
            cluster.maxY + 0.0,
        )
        var fitted = GridRect(
            minX = (centerX - width / 2).toInt(),
            minY = (centerY - height / 2).toInt(),
            maxX = (centerX + width / 2).toInt(),
            maxY = (centerY + height / 2).toInt(),
        ).clamped(bounds)

        if (!fitted.contains(cluster)) {
            fitted = fitted.union(cluster).clamped(bounds)
        }
        return fitted
    }

    private fun aspectScore(aspect: Double, target: Double): Double {
        val safeAspect = max(0.001, aspect)
        val safeTarget = max(0.001, target)
        return (1.0 - min(1.0, abs(ln(safeAspect / safeTarget)) / ln(2.0))).coerceIn(0.0, 1.0)
    }

    private fun failure(
        startedAt: Long,
        reason: String,
        width: Int,
        height: Int,
        rotation: Int,
        extraDiagnostics: Map<String, Any?> = emptyMap(),
        debugMasks: Map<String, Any?>? = null,
    ): Map<String, Any?> {
        val diagnostics = mutableMapOf<String, Any?>(
            "pipeline" to "seed_cluster_outer_boundary_v4",
            "detector_registered" to true,
            "detector_called" to true,
            "detector_success" to false,
            "selected_candidate_source" to null,
            "width" to width,
            "height" to height,
            "rotation" to rotation,
            "selected_failure_reason" to reason,
        )
        diagnostics.putAll(extraDiagnostics)
        if (debugMasks != null) {
            diagnostics["debug_masks"] = debugMasks
        }
        return mapOf(
            "success" to false,
            "points" to emptyList<Map<String, Double>>(),
            "confidence" to 0.0,
            "elapsed_ms" to elapsedMillis(startedAt),
            "failure_reason" to reason,
            "diagnostics" to diagnostics,
        )
    }

    private fun debugMasks(
        seedMask: BooleanArray,
        edgeMask: BooleanArray,
        combinedMask: BooleanArray,
    ): Map<String, Any?> {
        return mapOf(
            "width" to GRID_WIDTH,
            "height" to GRID_HEIGHT,
            "masks" to mapOf(
                "seed_mask" to maskBytes(seedMask),
                "edge_mask" to maskBytes(edgeMask),
                "combined_card_mask" to maskBytes(combinedMask),
            ),
        )
    }

    private fun maskBytes(mask: BooleanArray): ByteArray {
        val bytes = ByteArray(mask.size)
        for (index in mask.indices) {
            bytes[index] = if (mask[index]) 255.toByte() else 0.toByte()
        }
        return bytes
    }

    private fun rectsNear(a: GridRect, b: GridRect, thresholdX: Int, thresholdY: Int): Boolean {
        return a.minX <= b.maxX + thresholdX &&
            b.minX <= a.maxX + thresholdX &&
            a.minY <= b.maxY + thresholdY &&
            b.minY <= a.maxY + thresholdY
    }

    private fun mergeComponents(a: Component, b: Component): Component {
        return Component(
            count = a.count + b.count,
            rect = a.rect.union(b.rect),
            componentCount = a.componentCount + b.componentCount,
        )
    }

    private fun touchesFrameTooMuch(rect: GridRect): Boolean {
        val touchesX = rect.minX <= 1 || rect.maxX >= GRID_WIDTH - 2
        val touchesY = rect.minY <= 1 || rect.maxY >= GRID_HEIGHT - 2
        return (touchesX && rect.normWidth > 0.72) ||
            (touchesY && rect.normHeight > 0.82) ||
            (touchesX && touchesY)
    }

    private fun gridIndex(x: Int, y: Int): Int = y * GRID_WIDTH + x

    private fun percentile(values: List<Int>, p: Double): Int {
        if (values.isEmpty()) return 0
        val index = ((values.size - 1) * p).toInt().coerceIn(0, values.size - 1)
        return values[index]
    }

    private fun normalizedRotation(rotation: Int): Int {
        val normalized = rotation % 360
        return if (normalized < 0) normalized + 360 else normalized
    }

    private fun elapsedMillis(startedAt: Long): Int {
        return ((System.nanoTime() - startedAt) / 1_000_000L).toInt()
    }

    private data class YuvFrame(
        val width: Int,
        val height: Int,
        val yBytes: ByteArray,
        val uBytes: ByteArray,
        val vBytes: ByteArray,
        val yRowStride: Int,
        val uvRowStride: Int,
        val uvPixelStride: Int,
        val rotation: Int,
    ) {
        fun sampleDisplay(displayX: Double, displayY: Double): YuvSample {
            val imagePoint = displayNormToImageNorm(displayX, displayY)
            val x = (imagePoint.x.coerceIn(0.0, 1.0) * (width - 1)).toInt().coerceIn(0, width - 1)
            val y = (imagePoint.y.coerceIn(0.0, 1.0) * (height - 1)).toInt().coerceIn(0, height - 1)
            val yValue = samplePlane(
                bytes = yBytes,
                x = x,
                y = y,
                rowStride = yRowStride,
                pixelStride = 1,
                fallback = 16,
            )
            val uvX = x / 2
            val uvY = y / 2
            val uValue = samplePlane(
                bytes = uBytes,
                x = uvX,
                y = uvY,
                rowStride = uvRowStride,
                pixelStride = uvPixelStride,
                fallback = 128,
            )
            val vValue = samplePlane(
                bytes = vBytes,
                x = uvX,
                y = uvY,
                rowStride = uvRowStride,
                pixelStride = uvPixelStride,
                fallback = 128,
            )
            return YuvSample(
                y = yValue,
                chroma = abs(uValue - 128) + abs(vValue - 128),
            )
        }

        private fun displayNormToImageNorm(displayX: Double, displayY: Double): Point {
            return when (rotation) {
                90 -> Point(displayY, 1.0 - displayX)
                180 -> Point(1.0 - displayX, 1.0 - displayY)
                270 -> Point(1.0 - displayY, displayX)
                else -> Point(displayX, displayY)
            }
        }

        private fun samplePlane(
            bytes: ByteArray,
            x: Int,
            y: Int,
            rowStride: Int,
            pixelStride: Int,
            fallback: Int,
        ): Int {
            val offset = (y * rowStride) + (x * pixelStride)
            if (offset < 0 || offset >= bytes.size) return fallback
            return bytes[offset].toInt() and 0xFF
        }
    }

    private data class Point(val x: Double, val y: Double)

    private data class YuvSample(val y: Int, val chroma: Int)

    private data class Grid(
        val luma: IntArray,
        val chroma: IntArray,
        val edge: IntArray,
        val sampleCount: Int,
        val chromaThreshold: Int,
        val darkLumaThreshold: Int,
        val brightLumaThreshold: Int,
        val edgeThreshold: Int,
    )

    private data class GridRect(
        val minX: Int,
        val minY: Int,
        val maxX: Int,
        val maxY: Int,
    ) {
        val width: Int get() = maxX - minX + 1
        val height: Int get() = maxY - minY + 1
        val area: Int get() = width * height
        val areaRatio: Double get() = area.toDouble() / (GRID_WIDTH * GRID_HEIGHT)
        val normWidth: Double get() = width.toDouble() / GRID_WIDTH
        val normHeight: Double get() = height.toDouble() / GRID_HEIGHT
        val centerX: Double get() = (minX + maxX + 1).toDouble() / (2.0 * GRID_WIDTH)
        val centerY: Double get() = (minY + maxY + 1).toDouble() / (2.0 * GRID_HEIGHT)

        fun toNormRect(): NormRect {
            return NormRect(
                left = (minX.toDouble() / GRID_WIDTH).coerceIn(0.0, 1.0),
                top = (minY.toDouble() / GRID_HEIGHT).coerceIn(0.0, 1.0),
                right = ((maxX + 1).toDouble() / GRID_WIDTH).coerceIn(0.0, 1.0),
                bottom = ((maxY + 1).toDouble() / GRID_HEIGHT).coerceIn(0.0, 1.0),
            )
        }

        fun toMap(): Map<String, Double> {
            val norm = toNormRect()
            return mapOf(
                "left" to norm.left,
                "top" to norm.top,
                "right" to norm.right,
                "bottom" to norm.bottom,
            )
        }

        fun expanded(left: Int, top: Int, right: Int, bottom: Int): GridRect {
            return GridRect(
                minX = minX - left,
                minY = minY - top,
                maxX = maxX + right,
                maxY = maxY + bottom,
            )
        }

        fun clamped(bounds: GridRect): GridRect {
            return GridRect(
                minX = minX.coerceIn(bounds.minX, bounds.maxX),
                minY = minY.coerceIn(bounds.minY, bounds.maxY),
                maxX = maxX.coerceIn(bounds.minX, bounds.maxX),
                maxY = maxY.coerceIn(bounds.minY, bounds.maxY),
            ).normalized()
        }

        fun normalized(): GridRect {
            return GridRect(
                minX = min(minX, maxX),
                minY = min(minY, maxY),
                maxX = max(minX, maxX),
                maxY = max(minY, maxY),
            )
        }

        fun union(other: GridRect): GridRect {
            return GridRect(
                minX = min(minX, other.minX),
                minY = min(minY, other.minY),
                maxX = max(maxX, other.maxX),
                maxY = max(maxY, other.maxY),
            )
        }

        fun contains(other: GridRect): Boolean {
            return minX <= other.minX && minY <= other.minY && maxX >= other.maxX && maxY >= other.maxY
        }

        fun nearFrameBorder(): Boolean {
            return minX <= 2 || minY <= 2 || maxX >= GRID_WIDTH - 3 || maxY >= GRID_HEIGHT - 3
        }
    }

    private data class NormRect(
        val left: Double,
        val top: Double,
        val right: Double,
        val bottom: Double,
    )

    private data class Component(
        val count: Int,
        val rect: GridRect,
        val componentCount: Int,
    ) {
        val areaRatio: Double get() = rect.areaRatio
        val centerX: Double get() = rect.centerX
        val centerY: Double get() = rect.centerY
    }

    private data class LineScore(
        val position: Int,
        val support: Double,
        val reason: String,
    )

    private data class CandidateScore(
        val clusterIndex: Int,
        val cluster: Component,
        val rect: GridRect,
        val score: Double,
        val aspect: Double,
        val areaRatio: Double,
        val edgeSupport: Double,
        val seedCoverage: Double,
        val leftEdgeSupport: Double,
        val rightEdgeSupport: Double,
        val topEdgeSupport: Double,
        val bottomEdgeSupport: Double,
        val expansionLeft: Int,
        val expansionRight: Int,
        val expansionTop: Int,
        val expansionBottom: Int,
        val expansionStopReasons: Map<String, String>,
        val contentVsOuterAreaRatio: Double,
    )
}
